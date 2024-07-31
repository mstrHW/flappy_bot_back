// https://github.com/yagop/node-telegram-bot-api/issues/319#issuecomment-324963294
// Fixes an error with Promise cancellation
process.env.NTBA_FIX_319 = 'test';

// Require our Telegram helper package
const TelegramBot = require('node-telegram-bot-api');
const process = require("process");

// Export as an asynchronous function
// We'll wait until we've responded to the user
module.exports = async (request, response) => {
    try {
        // Create our new bot handler with the token
        // that the Botfather gave us
        // Use an environment variable so we don't expose it in our code
        const bot = new TelegramBot(process.env.BOT_TOKEN);

        // Retrieve the POST request body that gets sent from Telegram
        const { body } = request;

        // Ensure that this is a message being sent
        if (body.message) {
            // Retrieve the ID for this chat
            // and the text that the user sent
            const { chat: { id }, text } = body.message;

            // Create a message to send back
            // We can use Markdown inside this
            const message = `✅ Thanks for your message: *"${text}"*\nHave a great day! 👋🏻`;
            // Create a message to send back
            //     bot.onText(/help/, (msg) => bot.sendMessage(msg.from.id, "Say /game if you want to play."));
            //     bot.onText(/start|game/, (msg) => bot.sendGame(msg.from.id, gameName));
            //     bot.on("callback_query", function (query) {
            //         console.log("user: " + query.message.from.id)
            //         if (query.game_short_name !== gameName) {
            //             bot.answerCallbackQuery(query.id, "Sorry, '" + query.game_short_name + "' is not available.");
            //         } else {
            //             queries[query.id] = query;
            //             let gameurl = process.env.APP_ENDPOINT;
            //             bot.answerCallbackQuery({
            //                 callback_query_id: query.id,
            //                 url: gameurl
            //             });
            //         }
            //     });
            //     bot.on("inline_query", function (iq) {
            //         bot.answerInlineQuery(iq.id, [{
            //             type: "game",
            //             id: "0",
            //             game_short_name: gameName
            //         }]);
            //     });

            // Send our new message back in Markdown and
            // wait for the request to finish
            await bot.sendMessage(id, message, {parse_mode: 'Markdown'});
        }
    }
    catch(error) {
        // If there was an error sending our message then we
        // can log it into the Vercel console
        console.error('Error sending message');
        console.log(error.toString());
    }

    // Acknowledge the message with Telegram
    // by sending a 200 HTTP status code
    // The message here doesn't matter.
    response.send('OK');
};