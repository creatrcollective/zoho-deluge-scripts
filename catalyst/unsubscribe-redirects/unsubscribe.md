# Email Notification Opt-Out System

This system allows contacts to unsubscribe from email notifications via a two-part integration between Zoho Catalyst and Zoho CRM.

## How It Works

The **Catalyst function** (index.js) exposes a public GET endpoint that accepts an email address as a query parameter. It validates the email format, then calls a CRM Deluge function via REST API. The **Deluge function** queries the Contacts module by email using COQL, updates the `Email_Notification_Opt_Out` boolean field to true, and returns a success/failure response that Catalyst displays to the user.

## Setup Requirements

- Deploy the Catalyst function and note its public URL
- In CRM, create a checkbox field called `Email_Notification_Opt_Out` on Contacts
- Create the Deluge function as REST API-callable with a CRM connection named `crm`
- Update the Catalyst code with your API key and switch from sandbox to production URL when ready
- Add unsubscribe links to your email templates: `https://{catalyst-url}/?email={{Contact.Email}}`

## Notes

The current implementation has a few gaps: no error handling for network failures in the axios call, the API key is hardcoded (should use environment variables). Consider adding rate limiting before production use.