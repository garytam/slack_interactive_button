const http = require('http');

// Initialize using verification token from environment variables
const createMessageAdapter = require('@slack/events-api').createMessageAdapter;
const slackMessages = createMessageAdapter('xoxb-195895235220-RvIHPUiKIlun4DhcwNnu2rzR');
// const port = process.env.PORT || 3000;
const port = 5004;

// Initialize an Express application
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// You must use a body parser for the urlencoded format before mounting the adapter
app.use(bodyParser.urlencoded({ extended: false }));

// Mount the event handler on a route
// NOTE: you must mount to a path that matches the Action URL or Options URL that was configured
app.use('/slack/actions', slackMessages.expressMiddleware());

// Attach action handlers
slackMessages.action('welcome_button', (payload) => {
    // Same as above...
});

// Start the express application
http.createServer(app).listen(port, () => {
    console.log(`server listening on port ${port}`);
});