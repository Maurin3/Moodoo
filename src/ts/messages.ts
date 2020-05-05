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

const readPath = "/jsonrpc";
var channels = new Array<MailChannel>();
var channel_ids = new Array<number>();
var active_channel : MailChannel;


var connection = new Connection('request');

window.addEventListener('load', () => {
    connection.request(callbackChannels, 'mail.channel', 'search_read', [['is_member', '=', true], ['channel_type', '=', 'chat'], ['channel_message_ids', '!=', false]], ['id', 'name', 'write_date', 'image_128']);
});

function callbackChannels(error: jayson.JSONRPCError, response: any): void {
    if (error) throw error;

    if (response.hasOwnProperty('error')){
        throw response.error;
    }
    else{
        var i = 0;
        var username = store.get('username');
        for (let channel of response.result){
            var name = channel.name.replace(username, "").replace(", ", "").replace(" ,", "");
            var chan = new MailChannel(channel.id, name, channel.write_date);
            channel_ids[i] = channel.id;
            channels[i] = chan;
            i++;
        }
        channels.sort((a, b) => (a.lastDate < b.lastDate) ? 1 : -1);
        active_channel = channels[0];
        createChannels(channels);
        connection.request(callbackMessages, 'mail.message', 'message_fetch', [["channel_ids", "=", active_channel.id]]);
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
        for (let message of response.result){
            var msg = new MailMessage(message.id, message.body, message.author_id[1], message.author_id[0], message.date, active_channel);
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
        var imageSrc = (channel.image) ? `src="data:image/jpeg;charset=utf-8;base64,${channel.image}"`: "";
        if (active_channel == channel) element.classList.toggle('active');
        element.setAttribute('data-chan-id', `${channel.id}`);
        element.innerHTML = `<img ${imageSrc} class="avatar"/>` +
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
    var date = new Date('1 Jan 2000');
    var lastAuthorMsg = undefined;
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
            var me = store.get('username');
            var imageSrc = (message.image) ? `src="data:image;charset=utf-8;base64,${message.image}"` : "";
            var left = (message.author != me) ? 'left' : 'right' ;
            element.innerHTML = `<div class="message-${left}" data-msg-id="${message.id}">
                <img ${imageSrc} class="conv-avatar"/>
                <div>
                    <div class="author-${left} mt-3 mb-2">${message.author}</div>
                    <div class="message">${message.body}</div>
                </div>
            </div>`;
            conv.appendChild(element);
            message.interval = setInterval(() => {
                if(message.image){
                    var img = <HTMLImageElement> document.querySelector(`[data-msg-id="${message.id}"]`).children[0]
                    img.src = `data:image;charset=utf-8;base64,${message.image}`;
                    // window.getComputedStyle(img, ':empty').webkitAnimationName = "";
                    debugger;
                    clearInterval(message.interval);
                }
            }, 3600);
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