# Fix Login Issue - Environment Variable Update Required

## The Problem
The application expects an environment variable called `APP_SECRET` but DigitalOcean is configured with `JWT_SECRET`.

This causes the JWT authentication to fail with the error: "The key returned from the callback must be a string or a buffer containing a secret or a private key"

## The Solution
You need to update the environment variable in DigitalOcean:

### Steps to Fix:

1. Go to your DigitalOcean App Platform: https://cloud.digitalocean.com/apps/98cd0402-e1d4-48ef-9adf-173580806a89

2. Click on "Settings" tab

3. Find the "nextier" service (API service)

4. In the environment variables section, find `JWT_SECRET`

5. **Change the name from `JWT_SECRET` to `APP_SECRET`**
   Keep the value the same: `yD8kL2mN9pQ3rT6vX1zA4bC7eF0gH5jK8lM9nO2pR3sT6uV9wX0yZ1aB4cD7eF0g`

6. Remove the `JWT_EXPIRES_IN` variable (it's not used)

7. Save the changes

8. The app will automatically redeploy

### After the fix:
Once the app redeploys (takes about 5-10 minutes), you should be able to login with:

**Email:** admin@nextier.com
**Password:** Admin123!

## Admin User Details
The admin user has been created in your database with:
- ID: 01JD8XN0ZMKQWB3VQXF6PA7YCJ
- Email: admin@nextier.com
- Password: Admin123! (hashed with Argon2)
- Role: admin

The password hash has been verified and is correct.
