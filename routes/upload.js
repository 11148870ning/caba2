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
    accessKeyId: 'ASIA5DYSEEJ47LZSYQGZ',
    secretAccessKey: '2sr6AkBUGn/Ezpht5FfPL6QoXx237NyKBk8vCIrS',
    sessionToken: 'IQoJb3JpZ2luX2VjEG8aDmFwLXNvdXRoZWFzdC0yIkYwRAIgVnlRVAl3cq+0bkNtCKjbwPrnbbwl9JDIe7GevdrhPogCIDT/FwsGa7M5hibv53dT2Nb6VCTCzux5DRh5BHqRI1fGKrADCGgQAhoMOTAxNDQ0MjgwOTUzIgwLkxtYcD2mdsJ1GVwqjQNYJDnWarZubVJp9niTIvRPc73icZvJj8hY9PvWmJmOp+7i24HLnJaiNFVuL2a6cBi+oEEs0gF0RD37f/Bg4FKJNDclCTdTAmGElYGY/IHjL7CGCo3MdKuRNf2wcqZ3V24NBfryGKrW4Cm7Ypntq+ndW13rXyeAOLfM+OTByQQcAgPvP6Ntlt/0zR9rY/6WFSe1v3oiyykZ0pt4fIUcdmNmT8CrwYbPRBp22utNkCl88UYiVlrfwW5po8+Yiu4rUEO23c02FI43v5bX2opW1ydLFCOsp3BJeWdHvbJTJPZnb7PX2j16N3T2InHC5/jzJkXpleGUVoICjOhqRMuHTEpqW0xQYA/pKigyNEK7k4+0rP+ybJ3Nh8FC4YfvcITVw4G2R36/ZRsWyh8asMvu8i2luGczRMk9RCi0aGIasQpl1pvBG9rMLqqQbftzrVbG8153n+8zy3Drs5dU5TfMb47Ot0rWPN+ML5C72JsTovE311ZBWWS5fZk6kImNQYiN2+ms5JfnCA7Q3q98gxqPMJjWsJsGOqcBGr+pBE7keujHP0idQ3sDVaH1WbKb5F7jKwnN/hQUY6z8yAZWmYJgxBMOWpd0ztDDFIORU6a91uaWzjqgKzThNtcFiZg0lR2MdSj5JtHjBK8UoSVaLJvO8CcABl5nABsO31pH23rm11h6r1VBA600cKxBauvvBT/jUJTwWXw2Pcaz6ahIQg2dDaTOqrJrryZczXjpJq5JpA9uTumq+s4iXo5uALohjZY=',
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