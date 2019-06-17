const express = require('express');
const router = express.Router();

router.get('/ping', (request, response) => {
  response.status(200).send({
    success: true,
    timestamp: Date.now(),
    data: "pong"
  })
})


module.exports = router;
