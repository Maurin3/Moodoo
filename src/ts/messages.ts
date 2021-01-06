import { remote, ipcRenderer } from 'electron';
import Connection from './connection';
import Store from './store';
import MailChannel from './mail_channel';
import MailMessage from './mail_message';

import * as jayson from 'jayson';
import * as path from 'path';
import * as url from 'url';

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

/* const storePic: Store = new Store({
    configName: 'conv-pics',
    defaults: {
        data: {}
    }
}); */

var channels = new Array<MailChannel>();
var channel_ids = new Array<number>();
var active_channel : MailChannel;
var date = new Date('1 Jan 2000');
var lastAuthorMsg = undefined;

var connection = new Connection('request');

window.addEventListener('load', () => {
    document.getElementById('send-message').addEventListener('submit', sendMessage);
    document.getElementById('message-form').addEventListener('keypress', sendMessage);
    connection.request(callbackChannels, 'mail.channel', 'search_read', [['is_member', '=', true], ['channel_type', '=', 'chat'], ['channel_message_ids', '!=', false]], ['id', 'name', 'write_date', 'image_128']);
    //setInterval(receiveMessage, 3600);
});

function callbackChannels(error: jayson.JSONRPCError, response: any): void {
    if (error) throw error;

    if (response.hasOwnProperty('error')){
        throw response.error;
    }
    else{
        var i = 0;
        var username = store.get('username');
        debugger;
        /* var pics = {} */
        for (let channel of response.result){
            var name = channel.name.replace(username, "").replace(", ", "").replace(" ,", "");
            var chan = new MailChannel(channel.id, name, channel.write_date);
            /* pics[channel.id] = channel.image_128 */
            channel_ids[i] = channel.id;
            channels[i] = chan;
            i++;
        }
        channels.sort((a, b) => (a.lastDate < b.lastDate) ? 1 : -1);
        active_channel = channels[0];
        /* storePic.set('data', pics); */
        createChannels(channels);
        connection.request(callbackMessages, 'mail.message', 'message_fetch', [["res_id", "=", active_channel.id]]);
    }
}

function callbackMessages(error: jayson.JSONRPCError, response: any): void {
    if (error) throw error;

    if (response.hasOwnProperty('error')){
        throw response.error;
    }
    else{
        var i = 0;
        var messages = new Array<MailMessage>();
        debugger;
        for (let message of response.result){
            console.log(response.result)
            if(message.author_id[1].search(',') != -1){
                var author = message.author_id[1].split(',')[1];
            }
            else{
                var author = message.author_id[1];
            }
            var msg = new MailMessage(message.id, message.body, author, message.author_id[0], message.date, active_channel);
            messages[i] = msg;
            i++;
        }
        messages.sort((a, b) => (a.lastDate > b.lastDate) ? 1 : -1);
        createMessages(messages);
    }
}

function createChannels(chan: Array<MailChannel>){
    var convList = document.getElementById('conv-list');
    convList.innerHTML = "";
    for (let channel of chan){
        var date = channel.lastDate.toLocaleString();
        var element = document.createElement('div');
        element.classList.add('conversation-element');
        /* var imageSrc = (channel.image) ? `src="data:image/jpeg;charset=utf-8;base64,${channel.image}"`: ""; */
        if (active_channel == channel) element.classList.toggle('active');
        element.setAttribute('data-chan-id', `${channel.id}`);
        element.innerHTML = `<img class="avatar"/>` +
            `<div class="message-info">` +
            `<div class="author">${channel.name}</div>` +
            `<div class="date">${date}</div>` +
            `</div>`;
        element.addEventListener('click', function() {
            var oldElem = document.getElementsByClassName('active')[0]
            oldElem.classList.toggle('active');
            this.classList.toggle('active');
            active_channel = channel;
            connection.request(callbackMessages, 'mail.message', 'message_fetch', [["channel_ids", "=", active_channel.id]]);
        })
        channel.interval = setInterval(() => {
            if(channel.image){
                var img = <HTMLImageElement> document.querySelector(`[data-chan-id="${channel.id}"]`).children[0]
                img.src = `data:image;charset=utf-8;base64,${channel.image}`;
                // window.getComputedStyle(img, ':empty').webkitAnimationName = "";
                //.setProperty('animation-name', '');
                clearInterval(channel.interval);
            }
        }, 3600)
        convList.appendChild(element);
    }
}

function createMessages(messageList: Array<MailMessage>){
    var conv = document.getElementById('conv');
    conv.innerHTML = "";
    for(let message of messageList){
        var element = document.createElement('div');
        if(lastAuthorMsg == message.author && sameDay(date, message.lastDate)){
            var lastMsg = document.getElementsByClassName('message')[document.getElementsByClassName('message').length - 1];
            var parent = lastMsg.parentElement;
            element.classList.add('message');
            element.innerHTML = `${message.body}`;
            parent.appendChild(element);
        }
        else{
            if (!sameDay(date, message.lastDate)){
                date = message.lastDate;
                var dateSepElem = document.createElement('div');
                dateSepElem.classList.add('conversation-date-separator');
                dateSepElem.innerHTML = `<span class="conversation-date">${message.lastDate.toLocaleDateString()}</span>`
                conv.appendChild(dateSepElem);
            }
            var url = store.get('url');
            var me = store.get('uid');
            //var imageSrc = (message.image) ? `src="data:image;charset=utf-8;base64,${message.mailChannel.image}"` : ``;
            console.log(`https://${url}/web/image/res.partner/${message.uid}/image_128`)
            var left = (message.uid != me) ? 'left' : 'right' ;
            element.innerHTML = `<div class="message-${left}" data-msg-id="${message.id}">
                <img src="https://${url}/web/image/res.partner/${message.uid}/image_128" class="conv-avatar"/>
                <div>
                    <div class="author-${left} mt-3 mb-2">${message.author}</div>
                    <div class="message">${message.body}</div>
                </div>
            </div>`;
            /* message.interval = setInterval(() => {
                debugger;
                if(message.image){
                    var img = <HTMLImageElement> document.querySelector(`[data-msg-id="${message.id}"]`).children[0]
                    img.src = `data:image;charset=utf-8;base64,${message.image}`;
                    clearInterval(message.interval);
                }
            }, 1000); */
            conv.appendChild(element);
        }
        lastAuthorMsg = message.author;
    }
    conv.scrollTo(0,conv.scrollHeight);
}

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function sendMessage(event){
    var send = document.getElementById('send-message');
    var fromButton = event.type == 'click' && event.target == send;
    var fromTextbox = event.type == 'keypress' && event.keyCode == 13;
    if (fromButton || fromTextbox){
        event.preventDefault(); // stop the form from submitting
        var input = <HTMLInputElement>document.getElementById('message');
        var msg = input.value;
        var message = new MailMessage(0, msg, store.get('username'), store.get('uid'), new Date().toString(), active_channel);
        message.sendMessage();
        input.value = "";
        var conv = document.getElementById('conv');
        var element = document.createElement('div');
        if(lastAuthorMsg == message.author && sameDay(date, message.lastDate)){
            var lastMsg = document.getElementsByClassName('message')[document.getElementsByClassName('message').length - 1];
            var parent = lastMsg.parentElement;
            element.classList.add('message');
            element.innerHTML = `${message.body}`;
            parent.appendChild(element);
        }
        else{
            if (!sameDay(date, message.lastDate)){
                date = message.lastDate;
                var dateSepElem = document.createElement('div');
                dateSepElem.classList.add('conversation-date-separator');
                dateSepElem.innerHTML = `<span class="conversation-date">${message.lastDate.toLocaleDateString()}</span>`
                conv.appendChild(dateSepElem);
            }
            var me = store.get('username');
            var imageSrc = (message.image) ? `src="data:image;charset=utf-8;base64,${message.image}"` : ``;
            var left = (message.author != me && !message.author.includes(me)) ? 'left' : 'right' ;
            element.innerHTML = `<div class="message-${left}" data-msg-id="${message.id}">
                <img ${imageSrc} class="conv-avatar"/>
                <div>
                    <div class="author-${left} mt-3 mb-2">${message.author}</div>
                    <div class="message">${message.body}</div>
                </div>
            </div>`;
            message.interval = setInterval(() => {
                if(message.image){
                    var img = <HTMLImageElement> document.querySelector(`[data-msg-id="${message.id}"]`).children[0]
                    img.src = `data:image;charset=utf-8;base64,${message.image}`;
                    clearInterval(message.interval);
                }
            }, 1000);
            conv.appendChild(element);
        }
        lastAuthorMsg = message.author;
    }
}

function receiveMessage(){
    var message = new MailMessage(0, "", "", 0, new Date().toString(), active_channel);
    message.receiveMessage();
}