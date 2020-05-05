import MailMessage from './mail_message';
import Connection from './connection';
import * as jayson from 'jayson';
import Store from './store';
import * as path from 'path';
import * as fs from 'fs';

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

var connection = new Connection('request');

export default class MailChannel {
    id: number;
    name: string;
    lastDate: Date;
    mailMessages: Array<MailMessage>;
    image: string;
    interval: any;

    constructor(id: number, name: string, lastDate: string){
        this.id = id;
        this.name = name;
        this.lastDate = new Date(lastDate);
        this.setImage();
    }

    setMailMessage(mailMessages: Array<MailMessage>){
        this.mailMessages = mailMessages;
    }

    private setImage(){
        var self = this;
        function callback(error: jayson.JSONRPCError, response: any): void{
            if (error) throw error;

            if (response.hasOwnProperty('error')){
                throw response.error;
            }
            if (response.result.length != 0) {
                self.image = response.result[0]['image_128']
            }
            else{
                var text = fs.readFileSync(path.join(__dirname, '..', `/src/images/odoo_icon.png`));
                self.image = text.toString('base64');
            }
        }
        connection.request(callback, 'res.users', 'search_read', [['name', '=', self.name]], ['image_128']);
    }
}