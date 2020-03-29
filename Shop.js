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
            const pro = await client.getProfile(event.source.userId);
           mes=[{type:"text",text:`${pro.displayName}さん追加ありがとうございます！`},{type:"text",text:"商品を追加するをTAPしてください！"}]
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
  let returnMes;
  //特定のキーワードに応答
 if(userMes === "商品を登録する"){
   returnMes = {type:"text",text:"追加したい商品名を送ってください"}
 }else {
   addDB(e.source.userId,e.message.text,) //商品をDBに送る
   returnMes = {type:"text",text:`追加しました`}
 }
  return returnMes;
}

const postbackFunc = async function(e) {
  let mes;
  mes = {type:"text",text:`受け取ったメッセージ：${e.postback,data}`}
  return mes 
 
};


//DBに追加する関数
const addDB = async function(id,productName) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  const pro = await client.getProfile(id); 
  const tableName = "CovidFoofLoss";
  const params = {
    TableName: tableName,
    Item: {
      name :productName,
      userId: id,
   image : pro.pictureUrl
     
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


