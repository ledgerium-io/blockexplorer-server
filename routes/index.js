const express = require('express');
const router = express.Router();


router.use('/api', require('./api'));
router.use('/', require('./public'));



module.exports = router;
