"use strict";

const line = require("@line/bot-sdk");
const crypto = require("crypto");
const AWS = require("aws-sdk");
const axios = require("axios");
var request = require("request");
var fs = require("fs");
//インスタンス生成
const client = new line.Client({ channelAccessToken: process.env.ACCESSTOKEN });

exports.handler = (event, context) => {
  //署名検証
  let signature = crypto
    .createHmac("sha256", process.env.CHANNELSECRET)
    .update(event.body)
    .digest("base64");
  let checkHeader = (event.headers || {})["X-Line-Signature"];
  let body = JSON.parse(event.body);
  const events = body.events;
  console.log(events);

  //署名検証が成功した場合
  if (signature === checkHeader) {
    events.forEach(async event => {
      let mes;
      switch (event.type) {
        case "message": //メッセージがきた時
          mes = await messageFunc(event);
          break;
        case "postback": //ポストバックがきた時
          mes = await postbackFunc(event);
          break;
        case "follow": //フォローされた時
          //プロフィールを取得
          let pro = await client.getProfile(event.source.userId);
          mes = [
            {
              type: "text",
              text: `${pro.displayName}さん追加ありがとうございます！`
            },
            { type: "text", text: "商品を追加するをTAPしてください！" }
          ];
          break;
      }
      //メッセージを返信
      if (mes != undefined) {
        client
          .replyMessage(body.events[0].replyToken, mes)
          .then(response => {
            let lambdaResponse = {
              statusCode: 200,
              headers: { "X-Line-Status": "OK" },
              body: '{"result":"completed"}'
            };
            context.succeed(lambdaResponse);
          })
          .catch(err => console.log(err));
        return;
      }
    });
  }
};

const messageFunc = async function(e) {
  //メッセージがきた時の関数
  let mes;
  switch (e.message.type) {
    case "text": //テキストがきた時の関数
      mes = await textFunc(e);
      break;

    default:
      mes = { type: "text", text: "読み込めませんでした" };
  }
  return mes;
};

async function textFunc(e) {
  //textがきた時の関数
  let userMes = e.message.text;
  let returnMes = { type: "text", text: `${userMes}` };
  //特定のキーワードに応答
  if (userMes === "力になる") {
    //数をランダムで出す関数
    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }
    //db取得
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: "CovidFoofLoss"
    };
    const scanDB = await (() =>
      new Promise(resolve => {
        docClient.scan(params, function(err, data) {
          if (err) {
            console.log(err);
          } else {
            resolve(data);
          }
        });
      }))();
    if (scanDB !== undefined) {
      console.log(scanDB);

      console.log(scanDB.Items);
      const num = scanDB.Count; //DBにあるデータの数を取得
      console.log(`num:${num}`);

      const ram_num = getRandomInt(0, num); //最小と最大（最小以上最大未満）
      if (ram_num !== undefined) {
        console.log(`ram_num:${ram_num}`);
        const ramMes = scanDB.Items[ram_num].name;
        const ramImage = scanDB.Items[ram_num].image;

        console.log(`ramMES:${ramMes}`);

        const json = ramMes;
        const obj = JSON.parse(json);
        console.log(obj.title);

        returnMes = {
          type: "flex",
          altText: "Flex Message",
          contents: {
            type: "bubble",
            direction: "ltr",
            header: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: obj.title,
                  align: "center",
                  weight: "bold"
                },
                {
                  type: "text",
                  text: `商品名：${obj.name}`,
                  margin: "lg"
                }
              ]
            },
            hero: {
              type: "image",
              url: obj.image,
              size: "full",
              aspectRatio: "1.51:1",
              aspectMode: "fit"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: `紹介文：${obj.introduction}`,
                  wrap: true
                },
                {
                  type: "text",
                  text: `会社名：${obj.group}`,
                  margin: "lg"
                }
              ]
            },
            footer: {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "button",
                  action: {
                    type: "uri",
                    label: "会社URL",
                    uri: obj.url
                  }
                }
              ]
            }
          },
          sender: {
            name: obj.group,
            iconUrl: ramImage
          }
        };
      }

      return returnMes;
    }

    return returnMes;
  }

  const postbackFunc = async function(e) {
    let mes;
    mes = { type: "text", text: `受け取ったメッセージ：${(e.postback, data)}` };
    return mes;
  };

  //DBに追加する関数
  const addDB = async function(id, productName) {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const tableName = "CovidFoofLoss";
    const params = {
      TableName: tableName,
      Item: {
        userId: id,
        name: productName
      }
    };
    docClient.put(params, function(err, data) {
      if (err) {
        console.error(
          "Unable to add item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        callback(err);
        return;
      }
    });
  };
}
