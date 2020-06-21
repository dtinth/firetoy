# firetoy

Provision a public-but-secret ephemeral Firebase Realtime Database endpoints.

## Usage

After deploying, go to real-time database console and set up the following
structure:

- `clients`
  - `<clientId>`
    - `jwtSecret`: `"<secret>"`

This sets up the credentials needed to provision endpoints.

Next, mint a JWT with the `<clientId>` in the issuer (`iss`) claim.

```
$ node
> require('jsonwebtoken').sign({iss:'<clientId>'},'<secret>')
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI8Y2xpZW50SWQ-IiwiaWF0IjoxNTkyNzI1NDA4fQ.9OSAH69VurEp8AZymkxSRPx6hDE8fr1oruVbhjAs4g4'
```

Finally, call the `provision` function to generate an endpoint.

```
$ http post https://us-central1-<projectId>.cloudfunctions.net/provision \
  'Authorization: Bearer <jwt>'
{
    "expiresAt": "2020-09-18T21:18:33.063Z",
    "tenantId": "20200620T211833062Z-dtinth-84856058-2688-490c-9447-f9680897e5fd"
}
```

Now you can use that endpoint:

```
$ http get https://<projectId>.firebaseio.com/data/<tenantId>.json
null

$ http patch https://<projectId>.firebaseio.com/data/<tenantId>.json hello=world
{
    "hello": "world"
}

$ http get https://<projectId>.firebaseio.com/data/<tenantId>.json
{
    "hello": "world"
}
```

The endpoint expires after 3 months. After the endpoint expires it can still be
used but it may be deleted (when the deletion logic is implemented).
