import * as functions from 'firebase-functions'
import admin from 'firebase-admin'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

admin.initializeApp()

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const provision = functions.https.onRequest(
  async (request, response) => {
    try {
      const authorization = request.get('authorization')
      if (!authorization) {
        response.status(400).send('no authorization header')
        return
      }
      const m = authorization.match(/^Bearer\s+(\S+)$/i)
      if (!m) {
        response.status(400).send('malformed authorization header')
        return
      }
      const requestToken = m[1]
      const unsafePayload = jwt.decode(requestToken, { json: true })
      if (!unsafePayload) {
        response.status(400).send('malformed jwt')
        return
      }
      const issuer = unsafePayload.iss
      if (!issuer) {
        response.status(400).send('jwt missing issuer')
        return
      }
      const found = await admin
        .database()
        .ref('clients')
        .child(issuer)
        .once('value')
      if (!found.exists()) {
        response.status(400).send('jwt issuer not recognized')
        return
      }
      const jwtSecret = found.child('jwtSecret').val()
      if (!jwtSecret) {
        response
          .status(400)
          .send('jwt issuer does not have a usable jwt secret')
        return
      }
      jwt.verify(requestToken, jwtSecret)
      const tenantId =
        new Date().toJSON().replace(/\W/g, '') + '-' + issuer + '-' + uuidv4()
      const expiresAt = new Date(Date.now() + 86400e3 * 90).toJSON()
      await admin.database().ref('metadata').child(tenantId).set({
        publicRead: true,
        publicWrite: true,
        createdBy: issuer,
        expiresAt: expiresAt,
      })
      response.json({ tenantId, expiresAt })
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        response.status(401).send('jwt expired')
        return
      }
      if (error.name === 'JsonWebTokenError') {
        response.status(401).send('jwt error: ' + error.message)
        return
      }
      console.error(error)
      response.status(500).send('internal server error')
    }
  }
)
