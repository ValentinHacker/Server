## Folders  
  * **middlewares/** -> Contains all active middlewares plus a runtime-made `order.json` file that designates the middleware execution order and prevents middleware copying from `middleware/`, if empty (initially) the server will auto-copy the middlewares from the folder `middleware`.  
  * **middleware/** -> Contains all builtin middlewares.  
  * **builtin/** -> contains all builtin html templates.  
  * **public/** -> Contains all server pages.  
  * **private/** -> Contains all server-hidden data such as `Accounts/` and logs.  
  * **lib/** -> Contains all modules.  
  
## Environment  
  * **port** -> Server port.  
  * **home** -> Server main path.  
  * **index** -> Statically served directories homepage.  
  * **wares** -> Middlewares to be used, defaults to `Symbol('ALL')`.  
  * **auth** -> Admin user:pass key.  
  * **time** -> Default timeout for incomplete requests, redirections and other timing functions.  
  
## Builtins  
  * **command.js** -> Contains commands which can be executed by respective url, like : `http://localhost:8080/close?auth=admin:root` and `http://localhost:port/?login=admin:root&from=reg`, this middleware controls a `private/Accounts` folder with registered server accounts to be controlled by `register=account:password, unregister=account:password, login=account:password, logout (affects currently loged-in account)` commands in that order.  
  * **fix.js** -> Url autocorrection utility, e.g: suppose our server has a file called `file.htm` but the user requests for `FILE.html`, the server assumes and corrects the url as long as request content has not already been served.  
  * **static.js** -> Serves content under `/public` folder directly to the user. If user requests for a directory and that directory contains an index page (whose name is designated by `process.env.index` which defaults at `index` and applies for `.htm|.html|.js` filetypes), then that page is server instead of directory index list as long as that directory does not contain a `.noind` file and request content is not already served.  
  * **directory.js** -> Lists all files of a directory and prints on the `builtin/directory.html` page (by replacing `&&list&&` with the list and `&&dir&&` in the template with the directory path) as long as the directory does not contain a `.nodir` file and request content has not already been served.  
  * **end.js** -> It makes sure that all unfinished responses are terminated.  
  
> All middlewares whose names start with `d-` have themselves excluded from the middleware list.  
  
## Command-Line  
  * **reload** -> Forces middlewares to reload.  
  * **exit** -> Close commandline.  
  * **stop|close** -> Close server.  
  * **quit** -> Close process.  
  * **clear|clean** -> Clear console.  
  * *Everything else gets evaluated by `eval`*  
  
## Features  
  * Files/Folders with names containing `-d-` (plus its subfolders) are excluded from directory indexing and static serving.  
  * Files/Folders with names containing `-f-` (plus its subfolders) are excluded from the templating engine.  
  * Folders containing a `.nodir` file are excluded from directory indexing, if that file is not empty, only files listed inside are excluded.  
  * Folders containing a `.noind` file are excluded from static serving, if that file is not empty, only files listed inside are excluded.  
  * Folders containing a `.notmp` file are excluded from templating engine, if that file is not empty, only files listed inside are excluded.  
  * If any `.no` file contains the word `ALL` on one line then all contents of that directory are affected.  
  * All custom middlewares must have the following content :  
    ```javascript
    exports.name = 'middleware';
    exports.after = ['command'];
    exports.before = ['end'];
    exports.middleware = function middleware(request, response, message) {
    	request.pass(response, message);
    	return message.satisfied;
    };
    ```  
  * `request.satisfied` is a property (object) that holds several other properties used by middlewares to determine their operations. Like : `main` -> whether the response is being served, `event` -> whether an error or event occured.  
  
> In case of a fatal error, the `event.js` middleware, which is the only middleware outside of the respective folder, responds with the template `builtin/event.html` by replacing `&&code&&` with the error code, `&&msg&&` with the error message, `&&col&&` with the errorcode color, `&&back&&` with a boolean determining whether the browser should go back in history (previous page or `&&times&&` steps back), `&&ale&&` with a custom alert to the user, &&intr&& with redirection/action interval and `&&redi&&` with a redirect url.  
  
> ***All environmental variables can be placed inside `.npmrc` instead!***  