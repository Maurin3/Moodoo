import Store from './store';
import * as jayson from 'jayson';


const httpsPort = 443

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

export default class Connection{
    client: jayson.HttpsClient;
    db: string;
    url: string;

    constructor(type: string, company?: string){
        var path = '';
        switch (type){
            case 'login':
                path = '/web/session/authenticate'
                if (!company) throw new Error ("Company is not set!");
                this.db = this.setDatabase(company);
                this.url = this.setCompanyHostLink(company);
                break;
            case 'request':
                path = '/jsonrpc'
                this.url = store.get('url');
                this.db = store.get('db');
                break;
            default:
                throw new Error('The type of the request is not correctly set')
            
        }
        this.client = jayson.Client.https({'host': this.url, 'path': path, 'port': httpsPort});
    }

    loginRequest(callback: jayson.JSONRPCCallbackType, login?: string, password?: string){
        var params = {
            'db': this.db,
            'login': login,
            'password': password,
        }
        var id = this.generateCallID();
        return this.client.request('call', params, id, callback);
    }
    

    request(callback: jayson.JSONRPCCallbackType, model?: string, method?: string, ...args: any[]){   
        var params = {
            'service': 'object',
            'method': 'execute',
            'args' : [
                this.db,
                store.get('uid'),
                store.get('password'),
                model,
                method,
            ]
        }
        debugger;
        var i = params['args'].length;
        for (let arg of args){
            params['args'][i] = arg;
            i ++;
        }

        var id = this.generateCallID();
        return this.client.request('call', params, id, callback);
    }

    private generateCallID(){
        return String(Math.random() * 1000000000);
    }

    private setCompanyHostLink(company: string): string{
        company = this.removeIfProtocol(company);
        if (company.includes('runbot')){
            return company;
        }
        return 'www.' + company;
    }

    private removeIfProtocol(company: string): string{
        if (company.includes('http://')){
            company = company.split('http://')[1];
        }
        return company;
    }

    private setDatabase(company: string): string{
        company = this.removeIfProtocol(company);
        var db = company.split('.')[0];
        if (db == 'odoo'){
            return 'openerp';
        }
        if (company.includes('runbot')){
            return db + "-all";
        }
        return db;
    }

    getDb(): string{
        return this.db;
    }

    getURL(): string{
        return this.url;
    }

}
