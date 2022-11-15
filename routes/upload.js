const express = require('express');
const router = express.Router();
const multer = require('multer')
const upload = multer({dest: 'uploads/'})
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

const sharp = require('sharp');
// require('dotenv').config();
const AWS = require('aws-sdk');
const redis = require('redis');
const { stringify } = require('querystring');


let awsConfig = {
    region : 'ap-southeast-2',
    accessKeyId: 'ASIA5DYSEEJ43SJVYWH5',
    secretAccessKey: '2Njwl60dwJkXdQBUL/8spDoDEx/ek9ULbQp2yL1E',
    sessionToken: 'IQoJb3JpZ2luX2VjEO3//////////wEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhAOKXlWIN8iBoLT0xxxKlbROUuSmRrTUfjcl6J5vB8sdRAiB97A27BW9XjwF3m6xLhf6vkA9w/DfeTq7VZMfDTQbyuSq5Awjm//////////8BEAIaDDkwMTQ0NDI4MDk1MyIMYrxkkrUu0kyHyXahKo0D3hUXsE6Pky7tnX72MKTDrdUr3LmH7EoKwhQc0GhoTyTae8vSM0IkWyIfYBtYUYcJ/Bd3PRrDvbcyDH9K+Gz2IpN0DA+sLt8v1NqRPCy7y0VZWhGRqOt3S4rIkwvSKBz5nJK1/tq9cktwq+97qkmtfTC9NYQoBHr3s61nxLlOekq1tcme51FvegDYMEe9Gd4E7fO053He1mSTM8JGwgAemE8WTQgo6aBcF3mA+SA7yMTlsnnAhjaHvL1Ufy5XhUahjWOKISsnFQljZspQjkNfztm8SVTOyGUP+h8um8x/CaV1a6aVEqfnF79CTworu4gpxl3kev5Qd7yEUKPZD8/GYHkThJyMhMg4TN8UoKrKuWPbpqskrm28bChh9eWvC+1mDxTLsLswN+AU5lDIjnZlqofXvmApguC4Oms312c0tAj7vj7YGhKt3OhCixWtDshebmL5gRW2ifsRHivp8QCMf/++rCfYklVy54TOavFTYiKD6ZL3jlkAkP+WXKGboBpW3ZH3EHTi902js4jncDCwtMybBjqmAeqEAtzDnpjSDwp7Ow1H3uh+myJZuJELOOvEsOHh4QSQWuEmKG3FzX/SNa/66T8LzqbhREevBdWIuvBPXwPvxoLybHpG03RZYlJmfSlwliTOv+2Lb3NzpV1tygv8qdbY1HY9Xf0PwZw9Q/9Db4e0awUN077HwcBsKpqVij+st8wm1gBkze/KafpCfgb3qoUlBsSb93rTxbE+iEnzkt8cyG25yvgjIVk=',
}

AWS.config.update(awsConfig);


//create redis client then connect to it 
const redisClient = redis.createClient();
redisClient.connect().catch((err) => {
    console.log(err);
});

const bucketName = 'n11148870a2';
const s3 = new AWS.S3({ apiVersion : "2006-03-01"});


//create s3 bucket
s3.createBucket({Bucket: bucketName })
    .promise()
    .then(() => console.log(`created bucket: ${bucketName}`))
    .catch((err) => {
        if (err.statusCOde !== 409) {
            console.log(`Error creating bucket: ${err}`);
        }
    });

//handles post request - takes image file and resize the image then upload to s3 
router.post('/', upload.any(), async (req, res) => {

    const images = req.files;

    const height = req.body.height;
    const width = req.body.width;

    if (!images) {
        res.status(400).json({
            error: true,
            message: "Request body imcomplete"
        });
        return;
    }
    
    resizeAndUpload(images, height, width);
    
    res.status(201).json({error: false, message: "Upload successfully"})

    // const fileStream = fs.createReadStream(image.path)

    // const params = {
    //     Bucket: bucketName,
    //     Key: image.filename,
    //     Expires: 600,
    //     Body: fileStream
    // };

    // await s3.putObject(params)
    //     .promise()
    //     .then(() => {
    //         console.log(`successfully uploaded image to ${bucketName}`)
    // }).catch((err) => {
    //     if (err.statusCOde !== 409) {
    //         console.log(`Error uploading: ${err}`);
    //     }
    // })
  
})

function resizeAndUpload(images, height, width) {
    for (const image of images) {
        const img = sharp(image.path);
        
        img.resize({
            height: parseInt(height),
            width: parseInt(width),
            fit: 'contain',
            position: 'left',
        }).toBuffer().then((data) => {
            console.log("resizing img", data);
            uploadImage(data, image.filename);
            unlinkFile(image.path);
        })
    }

}

//upload image to s3 bucket
async function uploadImage(data, imageName) {
    const params = {
        Bucket: bucketName,
        Key: imageName,
        Expires: 600,
        Body: data
    };
    await s3.putObject(params)
        .promise()
        .then(() => {
            console.log(`successfully uploaded image to ${bucketName}`)
    }).catch((err) => {
        if (err.statusCOde !== 409) {
            console.log(`Error uploading: ${err}`);
        }
    })
}

router.get('/images/:key', (req, res) => {
    const key = req.params.key;
    const options = {
        Key: key,
        Bucket: bucketName
    }
    s3.getObject(options).createReadStream().pipe(res);
})

router.get('/getImg', async (req, res) => {

    const response = await s3.listObjectsV2({
        Bucket: bucketName
    }).promise()

    res.send({
        error: false,
        message: "?",
        images: response.Contents
    })
})



module.exports = router;
