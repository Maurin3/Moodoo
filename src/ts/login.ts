import { remote, ipcRenderer } from 'electron';
import Store from './store';
import Connection from './connection';

import * as jayson from 'jayson';
import * as path from 'path';
import * as url from 'url';

var mainWindow : number = remote.getCurrentWindow().id;

const store: Store = new Store({
    configName: 'user-login',
    defaults: {
        login: false,
        username: false,
        uid: false,
        db : false,
        url : false,
        password: false,
        profilePic: false
    }
});
window.addEventListener('load', () => {
    let login = store.get('login');
    let uid = store.get('uid');

    if (login && uid){
        document.getElementById('info').setAttribute('style', 'display: none !important;');
        document.getElementById('waiting').setAttribute('style', 'display: block !important;');
        ipcRenderer.sendSync('loadMessages', true);
    }
    else{
        document.getElementById('login-form').addEventListener('submit', submitLoginForm);
    }
});

function submitLoginForm() {
    event.preventDefault(); // stop the form from submitting

    document.getElementById('info').setAttribute('style', 'display: none !important;');
    document.getElementById('waiting').setAttribute('style', 'display: block !important;');

    var company = (<HTMLInputElement> document.getElementById('company')).value;
    var login = (<HTMLInputElement> document.getElementById('login')).value;
    var password = (<HTMLInputElement> document.getElementById('password')).value;

    var connection = new Connection('login', company);

    function callbackLogin(error: jayson.JSONRPCError, response: any): void {
        if (error) throw error;

        if (response.hasOwnProperty('error')){
            if (response.error.data.exception_type == 'access_denied'){
                let info = document.getElementById('info');
                let errorMessage = document.createElement('p');
                errorMessage.innerHTML = 'The login or the password is not correctly set.';
                errorMessage.classList.add('alert', 'alert-danger', 'm-3');
                info.children[0].appendChild(errorMessage);
            }
            else{
                throw response.error;
            }
        }
        else{
            store.sets(
                ['login', 'uid','db', 'url', 'username', 'password'],
                [response.result.username, response.result.uid, connection.getDb(), connection.getURL(), response.result.name, password]
            )
            ipcRenderer.send('loadMessages', store);
        }
    }
    connection.loginRequest(callbackLogin, login, password)
}