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

const storePic: Store = new Store({
    configName: 'conv-pics',
    defaults: {
        data: {}
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
        /* this.setImage(); */
    }

    setMailChannel(mailChannel: MailChannel){
        this.mailChannel = mailChannel;
    }

    /* private setImage(){
        var self = this;
        if (!store.get('profilePic')){
            function callback(error: jayson.JSONRPCError, response: any): void{
                if (error) throw error;
    
                if (response.hasOwnProperty('error')){
                    throw response.error;
                }
                store.set('profilePic', response.result[0]['image_128']);
            }
            connection.request(callback, 'res.partner', 'search_read', [['id', '=', store.get('uid')]], ['image_128']);
        }
        var me = store.get('username');
        this.image = (me && (self.author != me && !self.author.includes(me)))? storePic.get('data').id : store.get('profilePic');
    } */

    sendMessage(): number{
        var self = this;
        var args = {
            'message_type': 'user_notification',
            'body': this.body,
            'channel_ids': [[6, 0, [this.mailChannel.id]]]
        }
        function callback(error: jayson.JSONRPCError, response: any): number{
            if (error) throw error;

            if (response.hasOwnProperty('error')){
                throw response.error;
            }
            self.id = response.result[0];
            return self.id
        }
        return <any> connection.request(callback, 'mail.message', 'create', [args]);
    }

    receiveMessage(): number{
        var self = this;
        function callback(error: jayson.JSONRPCError, response: any): number{
            if (error) throw error;

            if (response.hasOwnProperty('error')){
                throw response.error;
            }
            self.id = response.result[0];
            debugger;
            // self.author = response.res
            return self.id
        }
        return <any> connection.request(callback, 'mail.message', 'read');
    }

}