# Solana Dev 101 - Email Notifications for dApps

## **Why would you build this?**

‍

We will be building this Vercel backend and [Replit](http://repl.it/) designed to receive data from Helius’ webhooks of on-chain Solana transactions and using node-mailer to send emails containing info about these transactions. This will allow users to be notified of important transactions in real time, such as when they receive a payment or when a new NFT is minted.

Here are some specific benefits of this system:

- **Real-time notifications:** Users will be notified of important transactions as soon as they happen. This will help them to stay up-to-date on their finances and be more involved in the Solana ecosystem.
- **Increased security:** Users will be able to receive notifications about suspicious transactions, such as attempts to withdraw funds from their account. This will help them to track their assets.
- **Improved user experience:** Users will have a more seamless experience when using Solana-based applications. They will be able to receive notifications about important events without having to manually check their accounts.

We believe that this system will be a valuable tool for Solana users. We are excited to see how it is used to improve the Solana ecosystem.

‍

[GitHub - Tidelaw/webhook-sms-email: Uses Helius's webhooks to send SMS notifications.](https://github.com/Tidelaw/webhook-sms-email)

‍

#### If following the below guide, feel free to ask for help in the [Helius Discord](https://discord.gg/HjummjUXgq) or check with the open-source [repository](https://github.com/Tidelaw/webhook-sms).

‍

## Replit Version

‍

Replit is a cloud-based integrated development environment (IDE) that allows you to write code, run it, and share it with others in real time. It is a great tool for beginners and experienced developers alike.

To create a Replit, simply go to the Replit website and click on the "Create a Repl" button. You will then be able to choose a programming language (javascript) and a template for your Repl. Once you have created your Repl, you can start coding right away.

Replit uses .env files to store environment variables. Environment variables are used to store sensitive information, such as API keys and passwords. They are not stored in plain text in your Replit, so they are more secure.

‍

## Replit Dependencies

‍

The following dependencies are required to run our script:

- nodemailer: This dependency is used to send emails.
- express: This dependency is used to create a web server.
- body-parser: This dependency is used to parse the body of HTTP requests.

‍

To install the dependencies, simply enter:

```shell
npm install nodemailer express body-parser
Copy
```

‍

Now, we can start our express server to start receiving data from the webhooks:

```javascript
解释
const nodemailer = require('nodemailer');
const express = require('express'),
  app = express(),
  bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
Copy
```

‍

1. The first line of code imports the nodemailer package, allowing us to send emails.
2. The second line of code creates an Express web server where we will be receiving data from Helius’s webhook.
3. The third line of code imports the body-parser module which makes it much easier to parse data from our webhook.
4. The fourth and fifth lines of code, configures the web server to parse JSON requests using our body-parser dependency.

We will now need to set up our Gmail API, as well as save these *environmental variables* to [replit](http://repl.it/).

‍

## Gmail API Keys

‍

First, follow [this guide](https://devanswe.rs/create-application-specific-password-gmail/) and acquire an App Password for Gmail, you’ll need to set up [**2-Step-Verification**](https://devanswe.rs/enable-2-step-verification-google-account/) as well. This is all we need to begin sending emails using node-mailer.

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646dc6b0d31da674a192e907_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F859bf9ba-024c-49d7-b837-17c43fecd892%252FUntitled.png)

‍

‍

## Setting up Replit environmental variables

‍

To access replit’s .env variable menu, locate it at the bottom left of your replit client.

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646a7b96d9887738caf1daf6_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252Fbadb4aaa-9083-427e-ab94-840165f7f806%252FUntitled.png)

‍

You’ll now see it being displayed on the bottom right, where your terminal is.

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646dc6c55a174329e8435a3b_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F82e5171c-d415-417e-bf04-b9660a28b3f4%252FUntitled.png)

‍

Simply enter the name of the variable e.g email_password where SECRET_KEY is, and input your values. receiver_email and sender_email are the two emails that will be used to send and receive the email, email_password in our case will be the password for the email you’ll be using to send it.

We can now start to receive data from our webhook:

```javascript
解释
app.post("/webhooks", async (req, res) => {

  const { body } = req;
	console.log(body)
  res.status(200).json("Success!");
  
};

app.listen(3000);
Copy
```

‍

The web server is configured to handle HTTP POST requests to the /webhooks route. When the web server receives a POST request to the /webhooks route, it will extract the body of the request and display it to the console for you to test. The web server will then respond to the request with a 200 OK status code to let Helius know we’ve received it so that they won’t send repeat messages.

‍

## Webhook Setup and Testing

‍

In order to begin testing, simply click the Run button and a website should appear on the right.

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646a7be255c1d11b999c676b_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F3c6e9a32-c944-4eec-b7d0-bf5a47a051a1%252FUntitled.png)

‍

Don’t be alarmed by the error, our server only accepts POST requests so we will need to use Helius to test. We can now head over to [Helius](https://helius.xyz/) and set up a webhook.

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646a7c00b7493959992b91f3_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F454e3365-8853-44f1-99c4-488e0bcd8f8f%252FUntitled.png)

‍

We’ll be listening to Mainnet transactions, of the ‘Enhanced’ type, these contain the description property that we will be sending as an email. Paste the link of the generated Replit server from before, in this case https://helius-webhook-sms-email.tidelaw.repl.co/webhooks and the wallet you wish to listen to. Make sure you include the **/webhooks** along with the Replit generated site!

You can now test it using this feature on the [Helius Developer Portal](https://dev.helius.xyz/)

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646a7c10d9887738caf22064_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F955f1f59-def2-40e7-90ce-83bbee6bbf4a%252FUntitled.png)

‍

Which should return this:

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646a7c1955c1d11b999c6e53_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252Ff6f912f3-9032-4a71-83a2-5464ddfec843%252FUntitled.png)

‍

Here is a JSON file of the data we received from Helius’s webhook:

```json
解释
[
  {
    accountData: [
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object], [Object], [Object],
      [Object]
    ],
    description: '5DxD5ViWjvRZEkxQEaJHZw2sBsso6xoXx3wGFNKgXUzE sold Fox #7637 to CKs1E69a2e9TmH4mKKLrXFF8kD3ZnwKjoEuXa6sz9WqX for 72 SOL on MAGIC_EDEN.',
    events: { nft: [Object] },
    fee: 10000,
    feePayer: 'CKs1E69a2e9TmH4mKKLrXFF8kD3ZnwKjoEuXa6sz9WqX',
    nativeTransfers: [ [Object], [Object], [Object], [Object], [Object] ],
    signature: '5nNtjezQMYBHvgSQmoRmJPiXGsPAWmJPoGSa64xanqrauogiVzFyGQhKeFataHGXq51jR2hjbzNTkPUpP787HAmL',
    slot: 171942732,
    source: 'MAGIC_EDEN',
    timestamp: 1673445241,
    tokenTransfers: [ [Object] ],
    type: 'NFT_SALE'
  }
]
Copy
```

‍

Notice that it is an array, in order for us to reference the object to send as a message, we will need to access the description property through body[0].description.

‍

## Email Integration

‍

We can now integrate Gmail, allowing us to send an email containing the description of the transaction.  You’ll first need to configure nodemailer to the service, or type of email you’ll be using. Then, reference the .env variables we just set up, with the details of the email you’ll be sending from.

```javascript
解释
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: `${process.env['sender_email']}`,
    pass: `${process.env['email_password']}`
  }
});
Copy
```

We can now code the actual sending of the email, using the express endpoint we set up before to receive the requests. We first create an object containing all the relevant info that nodemailer needs to send the email, e.g a sender, a receiver, a subject (not necessary), and the body. This is where we will be inserting the actual transaction data by referencing the body object we received from Helius’s webhooks - using the test data from before, we can determine how to access the description property.

```javascript
解释
app.post("/webhooks", async (req, res) => {
  const { body } = req;
  console.log(body)
  let mailOptions = {
    from: `${process.env['sender_email']}`,
    to: `${process.env['receiver_email']}`,
    subject: 'Sending Email using Node.js',
    text: body[0].description
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      res.status(200).json("Success!");
    }
  })
});
Copy
```

‍

The completed code should now look like this:

```javascript
解释
const nodemailer = require('nodemailer');
const express = require('express'),
  app = express(),
  bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: `${process.env['sender_email']}`,
    pass: `${process.env['email_password']}`
  }
});

app.post("/webhooks", async (req, res) => {
  const { body } = req;
  console.log(body)
  let mailOptions = {
    from: `${process.env['sender_email']}`,
    to: `${process.env['receiver_email']}`,
    subject: 'Sending Email using Node.js',
    text: body[0].description
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      res.status(200).json("Success!");
    }
  })
});

app.listen(3000);
Copy
```

‍

Congratulations! You should now be able to receive an email if you have correctly configured the .env variables and installed the right dependencies. If you’re stuck, feel free to send a message in the [Helius Discord](https://discord.gg/HjummjUXgq) for help.

‍

## Next Steps, Vercel Version

‍

The problem with [replit](http://repl.it/) is that there is a cost in keeping this script up 24/7, one solution is to host a website on [Vercel](http://vercel.com/) with only a backend, that will run constantly, at 0 cost. The setup is mostly the same, the only difference being where the .env variables are stored and a github repository.

First, you’ll need to fork this [repository](https://github.com/Tidelaw/webhook-sms-email):

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646a7e546c3aba8717ae7059_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F38447c97-fe8f-46a9-b5bf-2fb89457f075%252FUntitled.png)

‍

We can now head to [Vercel](http://vercel.com/) where you’ll need to make an account. Then, head to the dashboard and add a new project.

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646dc98edb16d1aa46c090de_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F45be4bd3-a813-41ce-82c3-0c676b7a43c1%252FUntitled.png)

‍

Simply add the environmental variables from **before** to the Vercel project:

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/646dc997d31da674a1941186_https%253A%252F%252Fs3-us-west-2.amazonaws.com%252Fsecure.notion-static.com%252F26630ee4-2380-43cb-b338-dcb34b800f99%252FUntitled.png)

‍

After deploying the project, you can now run the same tests that we did for [replit](http://repl.it/), you will now be able to receive emails containing onchain transaction data 24/7 for free!