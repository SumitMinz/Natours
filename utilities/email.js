const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Sumit Minz <${process.env.EMAIL_FROM}>`;
  }
  newTransport() {
    // if (process.env.NODE_ENV === 'production') {
    //   return 1;
    // }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  async send(template, subject) {
    // 1>> Render HTML based on pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    // 2>> Define email option
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };
    // 3>> Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family !');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (Valid for only 10 minutes)',
    );
  }
};

// const sendEmail = async (options) => {
//   //1> create a transporter
//   //2) DEFINE THE EMAIL OPTIONS

//   //3)ACTUALLY SEND THE MAIL
//   await transporter.sendMail(mailOptions);
// };
// module.exports = sendEmail;
