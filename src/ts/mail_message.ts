import MailChannel from "./mail_channel";
import Connection from './connection';
import * as jayson from 'jayson';
import Store from './store';

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

export default class MailMessage {
    id: number;
    mailChannel: MailChannel;
    body: string;
    author: string;
    uid: number;
    lastDate: Date;
    image: string;
    interval: any;

    constructor(id: number, body: string, author: string, uid: number, lastDate: string, mailChannel: MailChannel){
        this.id = id;
        this.body = body;
        this.author = author;
        this.uid = uid;
        this.lastDate = new Date(lastDate);
        this.mailChannel = mailChannel;
        this.setImage();
    }

    setMailChannel(mailChannel: MailChannel){
        this.mailChannel = mailChannel;
    }

    private setImage(){
        var self = this;
        if (!store.get('profilePic')){
            function callback(error: jayson.JSONRPCError, response: any): void{
                if (error) throw error;
    
                if (response.hasOwnProperty('error')){
                    throw response.error;
                }
                store.set('profilePic', response.result[0]['image_128']);
            }
            connection.request(callback, 'res.users', 'search_read', [['id', '=', store.get('uid')]], ['image_128']);
        }
        var interval = setInterval(() => {
            if(this.mailChannel.image){
                this.image = (store.get('username') && self.author != store.get('username'))? this.mailChannel.image : store.get('profilePic');
                clearInterval(interval);
            }
        }, 3600);
    }

}