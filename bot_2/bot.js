'use strict';

const RtmClient = require('@slack/client').RtmClient;
const MemoryDataStore = require('@slack/client').MemoryDataStore;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

class Bot {

    // ******************************* //
    //    Constructor                  //
    // ******************************* //
    constructor(opts) {
        let slackToken = opts.token;
        let autoReconnect = opts.autoReconnect || true;
        let autoMark = opts.autoMark || true;

        this.slack = new RtmClient(slackToken, {
            // Sets the level of logging we require
            logLevel: 'error',
            // Initialize a data store for our client,
            // this will load additional helper
            // functions for the storing and retrieval of data
            dataStore: new MemoryDataStore(),
            // Boolean indicating whether Slack should automatically
            // reconnect after an error response
            autoReconnect: autoReconnect,
            // Boolean indicating whether each message should be marked
            // as read or not after it is processed
            autoMark: autoMark
        });

        // ************************************** //
        //    listen for RTM Connection open even //
        // ************************************** //
        this.slack.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
            let user = this.slack.dataStore.getUserById(this.slack.activeUserId)
            let team = this.slack.dataStore.getTeamById(this.slack.activeTeamId);

            this.name = user.name;

            console.log(`Connected to ${team.name} as ${user.name}`);
        });


        // Create an ES6 Map to store our regular expressions
        this.keywords = new Map();

        // ******************************* //
        //    Listen for message event     //
        // ******************************* //
        this.slack.on(RTM_EVENTS.MESSAGE, (message) => {
            // Only process text messages
            if (!message.text) {
                return;
            }

            let channel = this.slack.dataStore.getChannelGroupOrDMById(message.channel);
            let user = this.slack.dataStore.getUserById(message.user);

            // Loop over the keys of the keywords Map object and test each
            // regular expression against the message's text property
            for (let regex of this.keywords.keys()) {
                if (regex.test(message.text)) {
                    let callback = this.keywords.get(regex);
                    callback(message, channel, user);
                }
            }
        });

        this.slack.start();
    }

    // ******************************* //
    //    build the keywords map       //
    // ******************************* //
    respondTo(keywords, callback, start) {
        // If 'start' is truthy, prepend the '^' anchor to instruct the
        // expression to look for matches at the beginning of the string
        if (start) {
            keywords = '^' + keywords;
        }

        // Create a new regular expression, setting the case
        // insensitive (i) flag
        let regex = new RegExp(keywords, 'i');

        // Set the regular expression to be the key, with the callback
        // function as the value
        this.keywords.set(regex, callback);
    }

    // ******************************* //
    //    send message to channel      //
    // ******************************* //
    send(message, channel, cb) {
        this.slack.sendMessage(message, channel.id, () => {
            if (cb) {
                cb();
            }
        });
    };


    // ******************************* //
    //    set typing on                //
    // ******************************* //
    setTypingIndicator(channel) {
        this.slack.send({ type: 'typing', channel: channel.id });
    };


}

// Export the Bot class, which will be imported when 'require' is
// used
module.exports = Bot;