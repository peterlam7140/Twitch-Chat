const config = require('./config.js');

const express = require('express');
const app = express();
const https = require('https');
const http = require('http');
const server = http.createServer(app);
const path = require('path');

const public = path.join(__dirname, '/..');
app.use('/css', express.static(public+'/css'));
app.use('/js', express.static(public+'/js'));
app.use('/plugin', express.static(public+'/plugin'));

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname + '/../index.html'));
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

const https_header = { headers: { 'Authorization' : 'Bearer ' + config.OAUTH_TOKEN, 'Client-Id' : config.CLIENT_ID } }

const msg_arr = {};
config.JOIN_CHANNEL.forEach(ele => { msg_arr["#"+ele] = []; });
msg_arr[config.SYSTEM_CHANNEL] = [];

var badges_arr = {};

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// --------------------------------------tmi-----------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

const tmi = require('tmi.js');
const opts = {
    options: { 
        // debug: true,
        clientId: config.CLIENT_ID,
    },
    connection: {
        reconnect: true,
        secure: true,
    },
    identity: {
      username: config.BOT_USERNAME,
      password: 'oauth:'+config.OAUTH_TOKEN,
    },
  };
const client = new tmi.client(opts);

client.on('connected', on_connected_Handler);
client.on("connecting", on_connecting_Handler);
client.on("disconnected", on_disconnected_Handler);
client.on("reconnect", on_reconnect_Handler);

client.on("emoteonly", on_emoteonly_Handler);
client.on("followersonly", on_followersonly_Handler);
client.on("subscribers", on_subscribers_Handler);

client.on("emotesets", (sets, obj) => { console.log(sets); console.log(obj); });

client.on("hosted", on_hosted_Handler);
client.on("hosting", on_hosting_Handler);
client.on("unhost", on_unhost_Handler);
client.on("raided", on_raided_Handler);

client.on("cheer", on_cheer_Handler);

client.on("subscription", on_subscription_Handler);
client.on("resub", on_resub_Handler);

client.on("giftpaidupgrade", on_giftpaidupgrade_Handler);
client.on("anongiftpaidupgrade", on_anongiftpaidupgrade_Handler);

client.on("subgift", on_subgift_Handler);
client.on("submysterygift", on_submysterygift_Handler);

client.on('message', on_message_Handler);
client.on("messagedeleted", on_messagedeleted_Handler);
client.on("clearchat", on_clearchat_Handler);

client.on("mod", on_mod_Handler);
client.on("unmod", on_unmod_Handler); 
client.on("mods", (channel, mods) => { console.log(channel); console.log(mods); });

client.on("notice", (channel, msgid, message) => { console.log(channel); console.log(message); });

client.on("join", (channel, username, self) => { });
client.on("part", (channel, username, self) => { });

client.on("roomstate", on_roomstate_Handler);
client.on("serverchange", on_serverchange_Handler);
client.on("slowmode", on_slowmode_Handler);

client.on("timeout", on_timeout_Handler);
client.on("ban", on_ban_Handler);

client.connect();

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ------------------------------------socket.io-------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {methods: ["GET", "POST"]},
    allowedHeaders: ["token"],
});

io.on('connection', (socket) => {
    // console.log(socket);
    IO_push_msgArr(socket);

    socket.on('message_send', (msg) => {
        // client.say('xxx', msg);
    });
    socket.on('disconnect', () => {
        // console.log('user disconnected');
    });

});

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------socket.io/admin---------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

// const { instrument } = require("@socket.io/admin-ui");
// instrument(io, {
//     auth: false,
// });

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ------------------------------------func-IO---------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

function IO_sendNormal (id, channel, date, name, msg, color = null, emotes = []) {
    let formatmessage = formatEmotes(msg, emotes);
    IO_msgPush(id, 'normal', channel, date, name, color, formatmessage, msg);
}

function IO_sendAlert (channel, msg, emotes = []) {
    let formatmessage = formatEmotes(msg, emotes);
    IO_msgPush('alert', 'alert', channel, getFullDate(), 'Alert', null, formatmessage, msg);
    consoleLog(getFullDate(), '', msg);
}

function IO_sendDanger (channel, msg) {
    IO_msgPush('danger', 'danger', channel, getFullDate(), 'Danger', null, msg, msg);
    consoleLog(getFullDate(), '', msg);
}

function IO_sendSuccess (channel, msg) {
    IO_msgPush('success', 'success', channel, getFullDate(), 'Success', null, msg, msg);
    consoleLog(getFullDate(), '', msg);
}

function IO_delNormal (channel, msg_id) {
    IO_msgDel(channel, msg_id);
}

function IO_msgPush (id, type, channel, date, name, color, msg, org_text) {
    channel = channel.replace("#", ""); if(config.SYSTEM_CHANNEL !== channel) channel = "#"+channel;
    var t = {'id': id, 'type': type, 'channel': channel, 'date': date, 'name': name, 'color': color, 'text': msg, 'org_text': org_text};
    add_msgArr(channel, t);
    io.emit('message_receive', t);
}

function IO_push_msgArr (socket) {
    socket.emit('message_record', msg_arr);
}

function IO_msgDel (channel, msg_id) {

}

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ------------------------------------func-TMI--------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

function TMI_join (channel) {
    let msg = `* Joining Channel: ${channel}`;
    IO_sendAlert(channel, msg);

    client.join(channel).catch((err) => {
        var msg = `Fail Join Channel: ${err}`;
        IO_sendDanger(channel, msg);
    });
}

function TMI_leave (channel) {
    client.part(channel).then(() => {
        let msg = `* Leaved Channel: ${channel}`;
        IO_sendSuccess(channel, msg);
    }).catch((err) => {
        var msg = `Fail Leave Channel: ${err}`;
        IO_sendDanger(channel, msg);
    });
}

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// -------------------------------------handler--------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

function on_message_Handler (channel, userstate, message, self) {

    if(userstate["message-type"] !== 'chat'){
        console.log('---------------------');
        console.log('on_message_Handler | '+userstate["message-type"]);
        console.log(channel);
        console.log(userstate);
        console.log(message);
        console.log(self);
    }

    switch(userstate["message-type"]) {
        case "action":
            // This is an action message..
            break;
        case "chat":
                var tt = '';
                if(userstate['badges']){ for(var i in userstate['badges']) { var t = get_badges (userstate['room-id'], i, userstate['badges'][i]); if(t){ tt += '<img src="'+t.image_url_1x+'"> '; } } }

                var name = tt + formatName(userstate['display-name'], userstate['username']);
                IO_sendNormal(userstate['id'], channel, convertTimeStmp(userstate['tmi-sent-ts']), name, message, userstate['color'], userstate['emotes']);
            break;
        case "whisper":
            // This is a whisper..
            break;
        default:
            // Something else ?
            break;
    }
}
  
function on_connected_Handler (addr, port) {
    let msg = `* Connected to ${addr} : ${port}`;
    IO_sendSuccess(config.SYSTEM_CHANNEL, msg);

    config.JOIN_CHANNEL.forEach(ele => { TMI_join(ele); });

    req_badges_global();

    // setTimeout(()=>{
    //     console.log(client.readyState());
    //     console.log(client.getChannels());
    //     console.log(client.getOptions());
    //     console.log(client.getUsername());
    // }, 500)
}

function on_connecting_Handler (addr, port) {
    let msg = `* Connecting to ${addr} : ${port}`;
    IO_sendAlert(config.SYSTEM_CHANNEL, msg);
}

function on_disconnected_Handler(reason) {
    let msg = `* Disconnected : ${reason}`;
    IO_sendDanger(config.SYSTEM_CHANNEL, msg);
}

function on_reconnect_Handler() {
    let msg = `* Reconnect`;
    IO_sendAlert(config.SYSTEM_CHANNEL, msg);
}

function on_emoteonly_Handler(channel, enabled) {
    let stat = (enabled)?'Opened':'Closed';
    let msg = `* ${channel} ${stat} Emote Only Mode`;
    IO_sendAlert(channel, msg);
}

function on_followersonly_Handler(channel, enabled, length) {
    let stat = (enabled)?'Opened':'Closed';
    let msg = `* ${channel} ${stat} Followers Only Mode (${length} min)`;
    IO_sendAlert(channel, msg);
}

function on_subscribers_Handler(channel, enabled) {
    let stat = (enabled)?'Opened':'Closed';
    let msg = `* ${channel} ${stat} Subscribers Only Mode`;
    IO_sendAlert(channel, msg);
}

function on_hosted_Handler(channel, username, viewers, autohost) {
    let stat = (autohost)?'Yes':'No';
    let msg = `* ${channel} is now hosted by ${username} (${viewers} viewers) (Auto-hosting : ${stat})`;
    IO_sendAlert(channel, msg);
}

function on_hosting_Handler(channel, target, viewers) {
    let msg = `* ${channel} is now hosting ${target} (${viewers} viewers)`;
    IO_sendAlert(channel, msg);
}

function on_unhost_Handler(channel, viewers) {
    let msg = `* ${channel} ended the current hosting (${viewers} viewers)`;
    IO_sendAlert(channel, msg);
}

function on_raided_Handler(channel, username, viewers) {
    let msg = `* ${channel} is now being raided ${username} (${viewers} viewers)`;
    IO_sendAlert(channel, msg);
}

function on_cheer_Handler(channel, userstate, message) {
    var name = formatName(userstate['display-name'], userstate['username']);
    let msg = `* ${name} cheered ${userstate['bits']} bits to a ${channel} : ${message}`;
    IO_sendAlert(channel, msg, userstate['emotes']);
}

function on_subscription_Handler(channel, username, method, message, userstate) {
    console.log('---------------------');
    console.log('on_subscription_Handler');
    console.log(userstate);
    let msg = `* ${username} new subscribed ${channel} (Cumulative ${userstate["msg-param-cumulative-months"]} months) : ${message}`;
    IO_sendAlert(channel, msg, userstate['emotes']);
}

function on_resub_Handler(channel, username, months, message, userstate, method) {
    console.log('---------------------');
    console.log('on_resub_Handler');
    console.log(userstate);
    let msg = `* ${username} streak subscribed ${channel} ${months} months (Cumulative ${userstate["msg-param-cumulative-months"]} months) : ${message}`;
    IO_sendAlert(channel, msg, userstate['emotes']);
}

function on_giftpaidupgrade_Handler(channel, username, sender, userstate) {
    console.log('---------------------');
    console.log('on_giftpaidupgrade_Handler');
    console.log(userstate);
    let msg = `* ${sender} giftpaidupgrade to ${username} in ${channel} (Cumulative ${userstate["msg-param-cumulative-months"]} months)`;
    IO_sendAlert(channel, msg, userstate['emotes']);
}

function on_anongiftpaidupgrade_Handler(channel, username, userstate) {
    console.log('---------------------');
    console.log('on_anongiftpaidupgrade_Handler');
    console.log(userstate);
    let msg = `* anonymous anongiftpaidupgrade to ${username} in ${channel} (Cumulative ${userstate["msg-param-cumulative-months"]} months)`;
    IO_sendAlert(channel, msg, userstate['emotes']);
}

function on_subgift_Handler(channel, username, streakMonths, recipient, method, userstate) {
    console.log('---------------------');
    console.log('on_subgift_Handler');
    console.log(userstate);
    var recipient = `${userstate['msg-param-recipient-display-name']} (${userstate['msg-param-recipient-user-name']})`;
    let msg = `* ${username} gifted a subscription ${recipient} in ${channel} (streak ${streakMonths} months) (Total given ${userstate["msg-param-sender-count"]} gifts)`;
    IO_sendAlert(channel, msg);
}

function on_submysterygift_Handler(channel, username, numbOfSubs, method, userstate) {
    console.log('---------------------');
    console.log('on_submysterygift_Handler');
    console.log(userstate);
    let msg = `* ${username} gifted a ${numbOfSubs} subscription in ${channel} (Total given ${userstate["msg-param-sender-count"]} gifts)`;
    IO_sendAlert(channel, msg);
}

function on_messagedeleted_Handler(channel, username, deletedMessage, userstate) {
    console.log('---------------------');
    console.log('on_messagedeleted_Handler');
    console.log(userstate);
    console.log(deletedMessage);
    let msg = `* ${username} message was deleted on ${channel}`;
    IO_sendAlert(channel, msg);

    IO_delNormal(channel, userstate["target-msg-id"]);
}

function on_clearchat_Handler(channel) {
    let msg = `* ${channel} got cleared`;
    IO_sendAlert(channel, msg);
}

function on_mod_Handler(channel, username) {
    let msg = `* ${username} got modded on ${channel}`;
    IO_sendAlert(channel, msg);
}

function on_unmod_Handler(channel, username) {
    let msg = `* ${username} got unmodded on ${channel}`;
    IO_sendAlert(channel, msg);
}

function on_roomstate_Handler(channel, state) {
    console.log('---------------------');
    console.log('on_roomstate_Handler');
    console.log(state);
    
    let msg = `* Joined Channel: ${channel} (slow: ${((state['slow'])?`${state['slow']}s`:'No')}) (subs-only: ${((state['subs-only'])?'Yes':'No')}) (emote-only: ${((state['emote-only'])?'Yes':'No')}) (lang: ${((state['broadcaster-lang'])?state['broadcaster-lang']:'N/A')})`;
    IO_sendSuccess(channel, msg);

    req_badges_channel(state['room-id']);
}

function on_serverchange_Handler(channel) {
    let msg = `* ${channel} is no longer located on this cluster`;
    IO_sendDanger(channel, msg);
}

function on_slowmode_Handler(channel, enabled, length) {
    let stat = (enabled)?'Opened':'Closed';
    let msg = `* ${channel} ${stat} slow mode (${length} sec)`;
    IO_sendAlert(channel, msg);
}

function on_timeout_Handler(channel, username, reason, duration, userstate) {
    console.log('---------------------');
    console.log('on_timeout_Handler');
    console.log(userstate);
    let msg = `* ${username} has been timed out ${duration} sec on a ${channel}` + ((reason != null)?` : ${reason}`:'');
    IO_sendAlert(channel, msg);
}

function on_ban_Handler(channel, username, reason, userstate) {
    console.log('---------------------');
    console.log('on_ban_Handler');
    console.log(userstate);
    let msg = `* ${username} has been banned on a ${channel}` + ((reason != null)?` : ${reason}`:'');
    IO_sendAlert(channel, msg);
}

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// --------------------------------------helper--------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

function formatName(displayname, username) {
    var valid = false;
    if(displayname != '' && displayname != null && displayname != 'undefined') {
        if(displayname.toLowerCase() !== username) {
            valid = true;
        }
    }
    return (valid)?`${displayname} (${username})`:displayname;
}

function formatEmotes(text, emotes) {
    if(text != null){
        var splitText = text.split("");
        for(var i in emotes) {
            var e = emotes[i];
            for(var j in e) {
                var mote = e[j];
                if(typeof mote == "string") {
                    mote = mote.split("-");
                    mote = [parseInt(mote[0]), parseInt(mote[1])];
                    var length = mote[1] - mote[0],
                        empty = Array.apply(null, new Array(length + 1)).map(function() {
                            return "";
                        });
                    splitText = splitText.slice(0, mote[0]).concat(empty).concat(splitText.slice(mote[1] + 1, splitText.length));
                    splitText.splice(mote[0], 1, "</span><img src=\"http://static-cdn.jtvnw.net/emoticons/v2/" + i + "/default/dark/1.0\"><span>");
                }
            }
        }
        return "<span>"+splitText.join("")+"</span>";
    } else {
        var t = "formatEmotes Error : "+text;
        console.log(t);
        return t;
    }
}

function getFullDate () {
    let date_obj = new Date();
    return formatFullDate(date_obj);
}

function convertTimeStmp (time) {
    let date_obj = new Date(parseInt(time));
    return formatFullDate(date_obj);
}

function formatFullDate (date_obj) {
    let date = ("0" + date_obj.getDate()).slice(-2);
    let month = ("0" + (date_obj.getMonth() + 1)).slice(-2);
    let year = date_obj.getFullYear();
    let hours = ("0" + date_obj.getHours()).slice(-2);
    let minutes = ("0" + date_obj.getMinutes()).slice(-2);
    let seconds = ("0" + date_obj.getSeconds()).slice(-2);
    
    return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}

function consoleLog (date, name, msg) {
    console.log(`-------------`);
    if(date)console.log(date);
    if(name)console.log(name);
    if(msg)console.log(msg);
}

function add_msgArr (channel, t) {
    if(msg_arr[channel].length >= config.MSG_MAX) { msg_arr[channel].shift(); }
    msg_arr[channel].push(t);
}

function get_badges (room_id, name, id) {
    var badges = null;

    if(badges_arr[room_id] != null && badges_arr[room_id] != 'undefined'){
        if(badges_arr[room_id].badge_sets[name] != null && badges_arr[room_id].badge_sets[name] != 'undefined'){
            badges = badges_arr[room_id].badge_sets[name].versions[id];
        }
    }

    if(badges_arr.global != null && badges_arr.global != 'undefined'){
    if(badges_arr.global.badge_sets != null && badges_arr.global.badge_sets != 'undefined'){
        if(badges_arr.global.badge_sets[name].versions[id] != null && badges_arr.global.badge_sets[name].versions[id] != 'undefined'){
            badges = badges_arr.global.badge_sets[name].versions[id];
        }
    }
}
    
    return badges;
}

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// -----------------------------------------get--------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

function req_get_api (url) {
    return new Promise((resolve) => {
        https.get(url, https_header, res => {
            let data = [];
            res.on('data', chunk => { data.push(chunk); });
            res.on('end', () => { resolve(JSON.parse(Buffer.concat(data).toString())); });
        }).on('error', err => { console.log('Error: ', err.message); });
    })
}

async function req_badges_global () {
    badges_arr.global = await req_get_api('https://badges.twitch.tv/v1/badges/global/display');
}

async function req_badges_channel (room_id) {
    badges_arr[room_id] = await req_get_api('https://badges.twitch.tv/v1/badges/channels/'+room_id+'/display');
}