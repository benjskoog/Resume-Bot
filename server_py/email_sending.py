import os
from flask import Flask
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

app = Flask(__name__)

# Flask-SendGrid configuration
app.config["SENDGRID_API_KEY"] = os.environ.get("SENDGRID_API_KEY")

def send_email(subject, body, recipients):
    message = Mail(
    from_email='benjaminjskoog@gmail.com',
    to_emails=recipients,
    subject=subject,
    html_content=body)
    try:
        sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        response = sg.send(message)
        print(response.status_code)
        print(response.body)
        print(response.headers)
    except Exception as e:
        print(e.message)

if __name__ == "__main__":
    app.run(debug=True)
