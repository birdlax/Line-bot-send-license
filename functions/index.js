const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

let serviceAccount = require('./line-38c22-firebase-adminsdk-3yk8q-e10baec1db.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://line-38c22.appspot.com'
});

let date = new Date();
date.setUTCHours(date.getUTCHours() + 7); // ปรับเวลาสำหรับ UTC+7
let formattedDate = date.toISOString().slice(0, 10);


exports.lineWebhook = functions.https.onRequest(async (req, res) => {
  const body = req.body;
  console.log('Received LINE webhook:', body);
  // ตรวจสอบ event และ message
  if (body.events && body.events.length > 0) {
    const event = body.events[0];
    if (event.type === 'message' && event.message.type === 'text') {
      console.time("ชื่อเวลา");
      const userId = event.source.userId;
      const messageText = event.message.text.toLowerCase();
      // ตรวจสอบข้อความ
      if (messageText === 'ขอข้อมูลวันนี้ท้ังหมด') {
        const usersSnapshot = await admin.firestore().collection(formattedDate).limit(5).get();
        const usersData = usersSnapshot.docs.map(doc => doc.data());
        await replyToLineMessage(event.replyToken, usersData);
        console.timeEnd("ชื่อเวลา");
      } else if (messageText.startsWith('')) {
        // ดึง requestedUserId และ secondPart
        const splitMessage = messageText.split(':'); 
        const secondPart = splitMessage[0]; 
        const requestedUserId = messageText; 
      
        // ดึงข้อมูลใน Firestore
        const documentRef = admin.firestore().collection(secondPart).doc(requestedUserId);
        const document = await documentRef.get();
        // ตรวจสอบว่ามีข้อมูลผู้ใช้
        if (document.exists) {
          const userData = document.data();
          // ส่งข้อมูลผู้ใช้กลับไปยัง LINE
          await replyToLine(event.replyToken, userData);
        } else {
          console.log('Document not found!');
          res.status(404).send('Document not found!');
        }
      } else {
        console.log('Received message:', event.message.text);
      }
    }
  }

  res.status(200).send();
});


async function replyToLine(replyToken, userData) {
  const lineConfig = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer HX8ffSxmj2tDZ0HyYHLHzaGPAgtH5C2zJRHL9IzZ+U0I9SZMZrI/SoFfvgQ0uNZGl60WEgN/RfZNEnWHMj6Guw2DCq61dnDdvQZMYnHenLV8K9/u/dsHu5L4Bq3fPrt9xz2+BLSK7U/G73glHq9z0wdB04t89/1O/w1cDnyilFU=`
    }
  };
  
  // Convert timestamp to Date object
  const dateObject = userData.Time.toDate();


  const body = {
    replyToken,
    messages: [
      {
        type: 'flex',
        altText: 'ข้อมูลหมวกกันน็อค',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'ข้อมูลหมวกกันน็อค',
                weight: 'bold',
                size: 'md',
              },
              {
                type: 'separator',
                margin: 'md',
              },
              { 
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'ชื่อหมวกกันน็อค:',
                    size: 'sm',
                    color: '#aaaaaa',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: userData.name_Helmate,
                    size: 'sm',
                    wrap: true,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'วันที่:',
                    size: 'sm',
                    color: '#aaaaaa',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: dateObject.toLocaleString(),
                    size: 'sm',
                    wrap: true,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: 'ID:',
                    size: 'sm',
                    color: '#aaaaaa',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: userData.id,
                    size: 'sm',
                    wrap: true,
                  },
                ],
              },
              {
                type: 'image',
                url: userData.download_url, // URL ของรูปภาพ
                size: 'full',
                aspectMode: 'cover',
                action: {
                  type: 'uri',
                  label: 'View Image',
                  uri: userData.download_url, // URL ของรูปภาพ
                },
              },
              {
                type: 'image',
                url: userData.url_license, // URL ของรูปภาพ
                size: 'full',
                aspectRatio: '3:1', // สามารถเปลี่ยนเป็นอัตราส่วนที่ต้องการได้
                flex: 3, // กำหนดความยืดหยุ่นขององค์ประกอบ
                margin: 'md',
                action: {
                  type: 'uri',
                  label: 'View Image',
                  uri: userData.url_license, // URL ของรูปภาพ
                },
              },
              
            ],
          },
        },
      },
    ],
  };

  try {
    const response = await axios.post('https://api.line.me/v2/bot/message/reply', body, lineConfig);
    console.log('Line API response:', response.data);
  } catch (error) {
    console.error('Error sending message to Line:', error);
  }
}

async function replyToLineMessage(replyToken) {
  const lineConfig = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer HX8ffSxmj2tDZ0HyYHLHzaGPAgtH5C2zJRHL9IzZ+U0I9SZMZrI/SoFfvgQ0uNZGl60WEgN/RfZNEnWHMj6Guw2DCq61dnDdvQZMYnHenLV8K9/u/dsHu5L4Bq3fPrt9xz2+BLSK7U/G73glHq9z0wdB04t89/1O/w1cDnyilFU=`
    }
  };


  let fonts = {
    Roboto: {
      normal: require('path').join(__dirname, 'node_modules', 'roboto-font', 'fonts', 'Roboto', 'roboto-regular-webfont.ttf'),
      bold: require('path').join(__dirname, 'node_modules', 'roboto-font', 'fonts', 'Roboto', 'roboto-bold-webfont.ttf'),
      italics: require('path').join(__dirname, 'node_modules', 'roboto-font', 'fonts', 'Roboto', 'roboto-italic-webfont.ttf'),
      bolditalics: require('path').join(__dirname, 'node_modules', 'roboto-font', 'fonts', 'Roboto', 'roboto-bolditalic-webfont.ttf')
    }
  };
  const bucket = admin.storage().bucket();

  async function uploadPDF(filename) {
    const filePath = path.resolve(__dirname, filename);
    await bucket.upload(filePath, {
      destination: `reports/${filename}`,
    });
    console.log(`Uploaded ${filename} to Firebase Storage.`);
  
    // Get the download URL for the uploaded file
    const fileRef = bucket.file(`reports/${filename}`);
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + (24 * 3600000), // Set the expiration date of the URL to a distant future date
    });
    console.log(`Download URL: ${url}`);
  
    return url;
  }
  
  async function fetchData() {
    const db = admin.firestore();
    const snapshot = await db.collection(formattedDate).get();
  
    if (snapshot.empty) {
      console.log('No matching documents.');
      return [];
    }
  
    let data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });
  
    return data;
  }
  // Function to download an image from a URL and return its base64 data
  async function downloadImage(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const imageBase64 = Buffer.from(response.data, 'binary').toString('base64');
      return `data:image/jpeg;base64,${imageBase64}`;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  async function createPDF() {
    // Assume data fetching and PDF preparation here
    let data = await fetchData();

    if (data.length === 0) {
      console.log('No data to generate PDF.');
      return;
    }
    let body = [];
    let rowNum = 1; 
    for (let item of data) {
      let downloadUrl = item.download_url;
      let imageUrl = downloadUrl ? await downloadImage(downloadUrl) : null;
      let licenseUrl = item.url_license;
      let licenseImageUrl = licenseUrl ? await downloadImage(licenseUrl) : null;
      let formattedTime = item.Time ? format(new Date(item.Time.toDate()), 'yyyy-MM-dd HH:mm:ss') : '';
    
      body.push([
        { text: rowNum.toString(), alignment: 'center' },
        { image: imageUrl || '', fit: [100, 100], alignment: 'center' },
        { image: licenseImageUrl || '', fit: [100, 100], alignment: 'center' },
        { text: item.name_Helmate || '', alignment: 'center' },
        { text: item.id || '', alignment: 'center' },
        { text: formattedTime || '', alignment: 'center' },
      ]);
      rowNum++; 
    }
    let pdfFilename = formattedDate+'.pdf';
    let printer = new PdfPrinter(fonts);
    let docDefinition = {
      content: [
        { text: 'รถทั้งหมดในวันนี้', style: 'header' },
        { table: { 
          widths: [25, 100, 100, 60, 100, 75], 
          body: [
            ['No.', 'Image', 'License', 'Name Helmet', 'ID',  'Time'], 
            ...body
          ] 
        } }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 20]
        }
      }
    };
    let pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(pdfFilename));
    pdfDoc.end();
    console.log('PDF created successfully.');

    return pdfFilename;  // Return the filename for uploading
  }

  try {
    const filename = await createPDF();
    const fileURL = await uploadPDF(filename);
    const response = await axios.post('https://api.line.me/v2/bot/message/reply', {
      replyToken: replyToken,
      messages: [
        {
          type: 'template',
          altText: 'This is a buttons template',
          template: {
            type: 'buttons',
            thumbnailImageUrl: 'https://i.gzn.jp/img/2021/01/23/pdf-history/00.png',
            title: 'PDF',
            text: 'PDF ข้อมูลรถที่ผ่านเข้ามาในวันนี้',
            actions: [
              {
                type: 'uri',
                label: 'ดาวโหลด PDF',
                uri: fileURL
              }
            ]
          }
        }
      ]
    }, lineConfig);
    console.log('Line API response:', response.data);
  } catch (error) {
    console.error('Error in replyToLine:', error);
  }
  
  
}
