const fs = module.parent.exports.fs,
querystring = module.parent.exports.querystring,
HOME = module.parent.exports.home,
chalk = module.parent.exports.chalk,
parent = module.parent.exports,
url = module.parent.exports.url;
const STORE = url.parse(module.filename).directory + '/midstore/' + url.parse(module.filename).filename + '.json';

exports.after = ['security'];
exports.before = ['fix', 'directory', 'static', 'end'];
exports.name = 'command';
var store = exports.store = {
	accounting: true,
	administration: true,
	time: 0
};

try {
	fs.ensureFileSync(STORE);
	exports.store = JSON.parse(fs.readFileSync(STORE));
} catch (err) {
	fs.writeFile(STORE, JSON.stringify(exports.store || '{}'), err => {
		if (!err) console.info(chalk`{green ${module.filename} Initialized.}`);
	});
}

fs.ensureDirSync(HOME + '/private/Accounts/' + parent.auth.replace(':', '@'));

parent.rl.on('line', line => {
	if (/^ban .+$/i.test(line)) {
		var user = line.split(' ').slice(1).join(' ').split('@')[0];
		fs.readdir(HOME + '/private/Accounts', (err, files) => {
			fs.remove(HOME + '/private/Accounts/' + files.filter(file => file.startsWith(user + '@'))[0], err => {
				if (err || !files.filter(file => file.startsWith(user + '@')).length) {
					console.error(chalk`{magenta.italic ${err || 'Invalid Username.'}}`);
				} else {
					console.info(chalk`User ${user} has been {redBright.bold Banned}.`);
				}
			});
		});
	} else if (/^reg(ist(er)?)? .+$/i.test(line)) {
		fs.readdir(HOME + '/private/Accounts', (err, files) => {
			var user = line.split(' ').slice(1).join(' ');
			if (!user.includes('@')) {
				user += '@none';
			}
			if (files.includes(user)) {
				console.error(chalk`{magenta.italic User Exists.}`);
				return;
			}
			fs.ensureFile(HOME + '/private/Accounts/' + user + '/stats.json', err => {
				if (err) {
					console.error(chalk`{magenta.italic ${err || 'No account password given.'}}`);
				} else {
					fs.writeFile(HOME + '/private/Accounts/' + user + '/stats.json', JSON.stringify({
						registration: {
							date: new Date()
						},
						login: {
							last: new Date()
						},
						logout: {
							last: null
						}
					}), err => {
						console.info(chalk`User ${user} has been {greenBright.bold Registered}.`);
					});
				}
			});
		});
	} else if (/^(user)?list$/i.test(line)) {
		fs.readdir(HOME + '/private/Accounts', (err, files) => {
			console.log(chalk`{bold ${files.join('\n')}}`);
		});
	}
});

exports.middleware = async function middleware(req, res, msg) {
	res.setHeader('Set-Cookie', req.headers.cookie || []);
	if (exports.store.administration &&  req.cookies.user == parent.auth.split(':')[0]) {
		if (/^\/close\/?$/i.test(msg.pathname)) {
			let err = new Error('Server Closed.');
			err.code = 'ESERCLS';
			req.satisfied.error = err;
			req.emit('evn', err);
			module.parent.exports.server.close();
		}
		if (/^\/eval\/?$/i.test(msg.pathname) || msg.query.eval) {
			try {
				console.log(chalk`{dim.bgGreen Eval'd : ${msg.query.eval}}`);
				try {
					let dat;
					res.end(dat = eval(msg.query.eval) + '');
					console.info(dat);
				} catch (err) {
					console.error(err);
					req.satisfied.error = err;
					req.emit('err', err);
				}
				req.satisfied.main = true;
			} catch (err) {
				req.satisfied.error = err;
				req.emit('err', err);
			}
		}
		if (/^\/restart\/?$/i.test(msg.pathname)) {
			let err = new Error('Server Restarting.');
			err.code = 'ESERRST';
			req.satisfied.event = err;
			req.emit('evn', err);
			module.parent.exports.restart();
		}
		if (/^\/reload\/?$/i.test(msg.pathname)) {
			let err = new Error('Server Reloading.');
			err.code = 'ESERRLD';
			req.satisfied.event = err;
			req.emit('evn', err);
			setTimeout(parent.loadMiddlewares, exports.store.time || parent.time || 5000);
		}
		if (/^\/ban\/?$/i.test(msg.pathname) && msg.query.user) {
			var evn = new Error('Account Banned.');
			evn.code = 'EACCBAN';
			evn.color = 'green';
			req.satisfied.event = evn;
			fs.readdir(HOME + '/private/Accounts', (err, files) => {
				if (err) {
					req.satisfied.error = err;
					req.emit('err', err);
					return;
				}
				fs.remove(HOME + '/private/Accounts/' + files.filter(file => file.startsWith(msg.query.user))[0], err => {
					if (err || !files.filter(file => file.startsWith(msg.query.user)).length) {
						evn = new Error('Invalid Account.');
						evn.code = 'EACCERR';
						delete evn.color;
						req.satisfied.event = evn;
						req.emit('evn', evn);
						return;
					}
					console.info(chalk`{dim.bgRed Account '${msg.query.user}' was banned...}`);
					req.emit('evn', evn);
				});
			});
		}
	}
	if (req.method === 'POST' && exports.store.accounting && (/^\/?((un)?register|log(in|out))?$/i.test(msg.pathname) || /[?&](log(in|out)|(un)?register)=.+/gi.test(msg.querystring))) {
		req.once('end', () => {
			msg.query = querystring.parse(req.data);
			msg.querystring = req.data;
			fs.readdir(HOME + '/private/Accounts', (err, files) => {
				if (err) {
					req.satisfied.error = err;
					req.emit('err', err);
					return;
				}
				if ((msg.query.register = msg.query.register || [msg.query.user || 'null', msg.query.pass || 'none'].filter(i => i).join(':')) && (msg.query.mode = msg.query.mode || msg.pathname.replace(/^\//, '')) == 'register') {
					let file = files.map(file => file.split('@')[0]);
					if (!file.includes(msg.query.register.split(':')[0]) && /^[a-z0-9#$%&\-+()!';]+$/i.test(msg.query.register.split(':')[0]) && /^[a-z0-9#$%&\-+()!';]+$/i.test(msg.query.register.split(':')[0] || 'none')) {
						let query = msg.query.register.split(':');
						if (query.length === 1) {
							query.push('none');
						}
						query = query.join('@');
						fs.ensureFile(HOME + '/private/Accounts/' + query + '/stats.json', err => {
							if (err) {
								req.satisfied.error = err;
								req.emit('err', err);
							} else {
								if (req.cookies.user) {
									fs.readFile(HOME + '/private/Accounts/' + [req.cookies.user, req.cookies.pass || 'none'].join('@') + '/stats.json', (err, data) => {
										var dat = JSON.parse(data || '{"logout": {}}');
										dat.logout.last = new Date();
										fs.writeFile(HOME + '/private/Accounts/' + [req.cookies.user, req.cookies.pass || 'none'].join('@') + '/stats.json', JSON.stringify(dat, null, 1), module.parent.exports.ignore);
									});
								}
								fs.writeFile(HOME + '/private/Accounts/' + query + '/stats.json', JSON.stringify({
									registration: {
										date: new Date(),
										ip: req.socket.remoteAddress
									},
									login: {
										last: new Date()
									},
									logout: {
										last: null
									}
								}));
							}
						});
						let err = new Error('Account created.');
						err.code = 'Success.';
						err.back = true;
						err.redirect = msg.query.redirect || '/';
						err.color = 'green';
						req.satisfied.error = err;
						req.emit('evn', err);
						let cookie = new Array(req.headers.cookie || []);
						cookie.push(`user=${query.split('@')[0]}; SameSite=Strict`);
						cookie.push(`pass=${query.split('@')[1]}; HttpOnly ; SameSite=Strict`);
						res.setHeader('Set-Cookie', cookie);
					} else {
						let err = new Error('Account name taken or invalid username/password characters passed.');
						err.code = 'Failure.';
						err.back = true;
						req.satisfied.error = err;
						req.emit('err', err);
					}
				}
				if ((msg.query.unregister = msg.query.unregister || [msg.query.user || 'null', msg.query.pass || 'none'].filter(i => i).join(':')) && (msg.query.mode = msg.query.mode || msg.pathname.replace(/^\//, '')) == 'unregister') {
					let query = msg.query.unregister.split(':');
					if (query.length === 1) {
						query.push('none');
					}
					query = query.join('@');
					if (files.includes(query)) {
						fs.remove(HOME + '/private/Accounts/' + query, module.parent.exports.ignore);
						let err = new Error('Account deleted.');
						err.code = 'Success.';
						err.back = true;
						err.redirect = msg.query.redirect || '/';
						err.color = 'green';
						req.satisfied.error = err;
						req.emit('evn', err);
					} else {
						let err = new Error('Account does not exist or invalid username/password passed.');
						err.code = 'Failure.';
						err.back = true;
						req.satisfied.error = err;
						req.emit('err', err);
					}
					let cookie = req.cookiearr.concat([]);
					cookie.push(`user=; SameSite=Strict; Max-Age=1; Expires=${new Date(0)}`);
					cookie.push(`pass=; HttpOnly ; SameSite=Strict; Max-Age=1; Expires=${new Date(0)}`);
					res.setHeader('Set-Cookie', cookie);
				}
				if ((msg.query.login = msg.query.login || [msg.query.user || 'null', msg.query.pass || 'none'].filter(i => i).join(':')) && (msg.query.mode = msg.query.mode || msg.pathname.replace(/^\//, '')) == 'login') {
					let query = msg.query.login.split(':');
					if (query.length === 1) {
						query.push('none');
					}
					query = query.join('@');
					if (files.includes(query)) {
						let cookie = req.cookiearr;
						cookie.push(`user=${query.split('@')[0]}; SameSite=Strict`);
						cookie.push(`pass=${query.split('@')[1]}; HttpOnly ; SameSite=Strict`);
						res.setHeader('Set-Cookie', cookie);
						let err = new Error('Successful login.');
						err.code = 'Success.';
						err.back = true;
						err.color = 'green';
						err.redirect = msg.query.redirect || '/';
						req.satisfied.error = err;
						req.emit('evn', err);
						if (req.cookies.user) {
							fs.readFile(HOME + '/private/Accounts/' + [req.cookies.user, req.cookies.pass || 'none'].join('@') + '/stats.json', (err, data) => {
								var dat = JSON.parse(data || '{"logout": {}}');
								dat.logout.last = new Date();
								fs.writeFile(HOME + '/private/Accounts/' + [req.cookies.user, req.cookies.pass || 'none'].join('@') + '/stats.json', JSON.stringify(dat, null, 1), module.parent.exports.ignore);
							});
						}
						fs.readFile(HOME + '/private/Accounts/' + query + '/stats.json', (err, data) => {
							var dat = JSON.parse(data || '{"login": {}}');
							dat.login.last = new Date();
							fs.writeFile(HOME + '/private/Accounts/' + query + '/stats.json', JSON.stringify(dat, null, 1), module.parent.exports.ignore);
						});
					} else {
						let err = new Error('Account name or password is invalid.');
						err.code = 'Failure.';
						err.back = true;
						req.satisfied.error = err;
						req.emit('err', err);
					}
				}
				if (/\/logout/gi.test(msg.pathname) || (msg.query.mode = msg.query.mode || msg.pathname.replace(/^\//, '')) == 'logout') {
					let query = [req.cookies.user, req.cookies.pass].filter(i => i);
					if (query.length === 1) {
						query.push('none');
					}
					query = query.join('@');
					let cookie = req.cookiearr.concat([]);
					cookie.push(`user=; SameSite=Strict; Max-Age=1; Expires=${new Date(0)}`);
					cookie.push(`pass=; HttpOnly ; SameSite=Strict; Max-Age=1; Expires=${new Date(0)}`);
					res.setHeader('Set-Cookie', cookie);
					var err;
					if (req.cookiearr.length) {
						err = new Error('Successful logout.');
						err.code = 'Success.';
						err.color = 'green';
						fs.readFile(HOME + '/private/Accounts/' + query + '/stats.json', (err, data) => {
							var dat = JSON.parse(data || '{"logout": {}}');
							dat.logout.last = new Date();
							fs.writeFile(HOME + '/private/Accounts/' + query + '/stats.json', JSON.stringify(dat, null, 1), module.parent.exports.ignore);
						});
					} else {
						err = new Error('Unsuccessful logout.');
						err.code = 'Failure.';
					}
					err.back = true;
					err.redirect = msg.query.redirect || '/';
					req.satisfied.error = err;
					req.emit('evn', err);
				}
				req.pass(res, msg);
			});
		});
	} else if (!req.satisfied.event) {
		req.pass(res, msg);
	}
	fs.writeFile(STORE, JSON.stringify(exports.store), parent.ignore);
	return req.satisfied;
};
