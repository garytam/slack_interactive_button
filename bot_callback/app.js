var express = require('express')
var request = require('superagent')
var bodyParser = require('body-parser')
var app = express()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

let slack_app_webhook_url = 'https://hooks.slack.com/services/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';
let slack_user  = '@hal2'
let slack_channel = "#hal2-channel";
let emoji_icon = ":robot_face:";

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
                "text": "Black Jack",
                "type": "button",
                "value": "blackjack"
            },
            {
                "name": "game",
                "text": "Pai Gow",
                "type": "button",
                "value": "paigow"
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

app.post('/slackactions', urlencodedParser, (req, res) =>{
    debugger
    console.log("here here");
    res.status(200).end() // best practice to respond with 200 status
    var actionJSONPayload = JSON.parse(req.body.payload) // parse URL-encoded payload JSON string
    var message = {
        "text": actionJSONPayload.user.name+" clicked: "+actionJSONPayload.actions[0].name + " : " + actionJSONPayload.actions[0].value,
        "replace_original": false
    }
    console.log(message.text);
    // sendMessageToSlackResponseURL(actionJSONPayload.response_url, message)
    send_webhook_msg(resp, emoji_icon, "Would you like to play more game ?")
})

function send_webhook_msg(msgs, icon, text){
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

app.listen(5004)