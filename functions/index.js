const functions = require('firebase-functions');
const app = require('express')();
const cors = require('cors');

const apiKey = '6f0fd351626fa2fd2fb723be500cd35a';

app.use(cors({ origin: true }));
app.get('/apiKey', (request, response)=>{
	response.send({apiKey : apiKey});
});
exports.apiKey = functions.https.onRequest(app);
// });