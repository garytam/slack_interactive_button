'use strict';

let Bot       = require('./Bot');
const redis   = require('redis');
const request = require('superagent');
const wikiAPI = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=";
const wikiURL = 'https://en.wikipedia.org/wiki/';


let redisClient = redis.createClient(6379, 'localhost');
// let general_incoming_webhook_url = 'https://hooks.slack.com/services/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';
let slack_app_webhook_url = 'https://hooks.slack.com/services/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';
let slack_user  = '@hal2'
let slack_channel = "#hal2-channel";
let emoji_icon = ":robot_face:";


var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false });

let resp =[
    {
        "text": "Choose a game to play hey hey hey",
        "fallback": "You are unable to choose a game",
        "callback_id": "game_button",
        "color": "#3AA3E3",
        "attachment_type": "default",
        "actions": [
            {
                "name": "game",
                "text": "Chess",
                "type": "button",
                "value": "chess"
            },
            {
                "name": "game",
                "text": "Falken's Maze",
                "type": "button",
                "value": "maze"
            },
            {
                "name": "game",
                "text": "Thermonuclear War",
                "style": "danger",
                "type": "button",
                "value": "war",
                "confirm": {
                    "title": "Are you sure?",
                    "text": "Wouldn't you prefer a good game of chess?",
                    "ok_text": "Yes",
                    "dismiss_text": "No"
                }
            }
        ]
    }];

const bot = new Bot({
    token: 'xoxb-195895235220-RvIHPUiKIlun4DhcwNnu2rzR',
    autoReconnect: true,
    autoMark: true
});

redisClient.on('error', (err) => {
    console.log('Error ' + err);
});

redisClient.on('connect', () =>{
    console.log('Connected to redis');
});

function getArgs(msg) {
    return msg.split(' ').slice(1);
};


bot.respondTo('playgame', (message, channel, user) => {
    console.log('into game');
    send_webhook_msg(resp, emoji_icon, "Would you like to play game ?")
})
/* ************************************************************ */
/*    send slack object back to channel                         */
/* ************************************************************ */
function send_webhook_msg(msgs, icon, text){
    debugger
    request
        .post(slack_app_webhook_url)
        .send({
            username: slack_user,
            channel: slack_channel,
            icon_emoji: icon,
            text: text,
            attachments: msgs
        })
        .end((err, res) => {
            if (err) {
                console.log(err);
            }
            // console.log(res);
        });
}

bot.respondTo('save', (message, channel, user) =>{
    debugger
    let args = getArgs(message.text);

    let key = args.shift();
    let value = args.join(' ');

    redisClient.set(key, value, (err) => {
        console.log("after saving....");
        if (err){
            console.log('error saving ' + err);
            bot.send('Oops!, something went wrong ' + err, channel)
        } else {
            bot.send(`OK! ${user.name}, I will remember this for you`, channel);
        }
    });
}, true);


app.post('/slackactions', urlencodedParser, (req, res) =>{
    debugger
    console.log("here here");
    res.status(200).end() // best practice to respond with 200 status
    var actionJSONPayload = JSON.parse(req.body.payload) // parse URL-encoded payload JSON string
    var message = {
        "text": actionJSONPayload.user.name+" clicked: "+actionJSONPayload.actions[0].name + " : " + actionJSONPayload.actions[0].value,
        "replace_original": false
    }
    sendMessageToSlackResponseURL(actionJSONPayload.response_url, message)
})

function sendMessageToSlackResponseURL(responseURL, JSONmessage){
    var postOptions = {
        uri: responseURL,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        json: JSONmessage
    }
    request(postOptions, (error, response, body) => {
        if (error){
            // handle errors as you see fit
        }
    })
}



bot.respondTo('fetch', (message, channel, user) =>{
    bot.setTypingIndicator(channel);

    let key = getArgs(message.text).shift();

    redisClient.get(key, (err, result) => {
        if (err){
            console.log(err);
            bot.send('Oops! sXXX happens !', channel)
        }

        bot.send('Here is what\'s in store ' + result, channel);

    });
});

bot.respondTo('hello', (message, channel, user) => {

    bot.send(`Hello to you too, ${user.name}! `, channel)

}, true);

function getWikiSummary(term, cb) {
    debugger
    // replace spaces with unicode
    let parameters = term.replace(/ /g, '%20');
    request
        .get(wikiAPI + parameters)
        .end((err, res) => {
            if (err) {
                cb(err);
                return;
            }

            let url = wikiURL + parameters;
            console.log(url);
            cb(null, JSON.parse(res.text), url);
        });
}

bot.respondTo('help', (message, channel) => {
    bot.send(`To use my Wikipedia functionality, type \`wiki\` followed by your search query`, channel);
}, true);


bot.respondTo('wiki', (message, channel, user) => {
    if (user && user.is_bot) {
        return;
    }

    bot.setTypingIndicator(message.channel);


    // grab the search parameters, but remove the command 'wiki' // from
    // the beginning of the message first
    let args = message.text.split(' ').slice(1).join(' ');

    getWikiSummary(args, (err, result, url) => {
        debugger

        if (err) {
            bot.send(`I\'m sorry, but something went wrong with your query`, channel);
            console.error(err);
            return;
        }

        let pageID = Object.keys(result.query.pages)[0];

        // -1 indicates that the article doesn't exist
        if (parseInt(pageID, 10) === -1) {
            bot.send('That page does not exist yet, perhaps you\'d like to create it:', channel);
            bot.send(url, channel);
            return;
        }

        let page = result.query.pages[pageID];
        let summary = page.extract;

        if (/may refer to/i.test(summary)) {
            bot.send('Your search query may refer to multiple things, please be more specific or visit:', channel);
            bot.send(url, channel);
            return;
        }

        if (summary !== '') {
            bot.send(url, channel);
            let paragraphs = summary.split('\n');

            paragraphs.forEach((paragraph) => {
                if (paragraph !== '') {
                    bot.send(`> ${paragraph}`, channel);
                }
            });
        } else {
            bot.send('I\'m sorry, I couldn\'t find anything on that subject. Try another one!', channel);
        }
    });
}, true);