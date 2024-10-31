const MSG_MAX = 1000;

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

const socket = io("http://localhost:3000/", {
    extraHeaders: {
      "token": "abcd"
    },
});
dialog_open('Connect...');

const form = document.getElementById('form');
const input = document.getElementById('input');

form.addEventListener('submit', function(e) {
  e.preventDefault();
  if (input.value) {
    socket.emit('message_send', input.value);
    input.value = '';
  }
});

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

socket.on('message_receive', function(result) {
    var list = document.getElementById("messages-"+result.channel);
    if(list.getElementsByTagName("li").length >= MSG_MAX) {list.getElementsByTagName("li")[0].remove();}
    
    var is_scroll = false;
    if( (window.scrollY + window.innerHeight) >= (document.body.scrollHeight - 300) )
    { is_scroll = true; }

    var item = msg_html(result);
    list.appendChild(item);
    document.getElementById('channel-name').getElementsByTagName("span")[1].textContent = list.children.length;
    if(is_scroll){ window.scrollTo(0, document.body.scrollHeight); }
});

socket.on('message_record', function(result) {
    document.getElementById("channel-list").innerHTML = '';
    document.getElementById("messages-wrapper").innerHTML = '';

    var init_channel = null;
    for(channel in result){
        if(init_channel == null) { init_channel = channel; }

        var item = document.createElement('li');
        item.innerHTML = channel;
        item.dataset.channel = channel;
        item.setAttribute("onclick","viewChannel('"+channel+"')");
        document.getElementById("channel-list").appendChild(item);
        
        var item = document.createElement('ul');
        item.classList = 'messages';
        item.setAttribute("id","messages-"+channel);
        document.getElementById("messages-wrapper").appendChild(item);

        result[channel].forEach(function(val) {
            var item = msg_html(val);
            document.getElementById("messages-"+channel).appendChild(item);
        });
    }

    // tippy('[data-tippy-content]');
    // tippy('#singleElement', { content: 'Tooltip', });

    viewChannel(init_channel);
});

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

socket.on("connect", () => {
    dialog_close();
});

socket.io.on("error", (error) => {
    alert_open(error);
});

socket.io.on("reconnect", (attempt) => {
    dialog_open(`Reconnect (${attempt})...`);
});

socket.io.on("reconnect_attempt", (attempt) => {
    dialog_open(`Connecting (${attempt})...`);
});

socket.io.on("reconnect_error", (error) => {
    dialog_open(`Reconnect Error (${error})...`);
});

socket.io.on("reconnect_failed", () => {
    dialog_open(`Reconnect Failed...`);
});

socket.io.on("ping", () => {
    alert_open(`Ping`);
});

// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------

function viewChannel(channel) {
    menu_close();
    document.querySelectorAll('.messages').forEach(function(ele){ ele.classList.remove("active"); });
    
    document.getElementById('messages-'+channel).classList.add("active");
    document.getElementById('channel-name').getElementsByTagName("span")[0].textContent = channel;
    document.getElementById('channel-name').getElementsByTagName("span")[1].textContent = document.getElementById("messages-"+channel).children.length;
    window.scrollTo(0, document.body.scrollHeight);
}

function menu_trigger() {
    document.getElementById("channel-list-wrapper").classList.toggle("active");
}

function menu_close() {
    document.getElementById("channel-list-wrapper").classList.remove("active");
}

function dialog_close() {
    document.getElementById('dialog-container').style.display = "none";
}

function dialog_open(text) {
    document.getElementById('dialog-container').getElementsByTagName("h3")[0].textContent = text;
    document.getElementById('dialog-container').style.display = "block";
}

function alert_open(text) {
    var item = document.createElement('li');
    item.innerHTML = `<h6>${getFullDate()}</h6><small>${text}<small>`;

    var list = document.getElementById('alert');
    list.insertBefore(item, list.childNodes[0]);
}

function msg_html(row) {
    var item = document.createElement('li');
    item.innerHTML = 
                        // '<div class="date">'+row.date+'</div>'+
                        '<div class="msg">'+row.text+'</div>'+
                        '<div class="name"><span>'+row.date+' | </span><span style="'+((row.color)?'color: '+row.color+';':'')+'">'+row.name+((row.channel && false)?` | [${row.channel}]`:'')+'</span></div>';
    item.classList = row.type;

    return item;
}

function getFullDate () {
    let date_ob = new Date();
    
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = ("0" + date_ob.getHours()).slice(-2);
    let minutes = ("0" + date_ob.getMinutes()).slice(-2);
    let seconds = ("0" + date_ob.getSeconds()).slice(-2);
    
    return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}

function scrollbtnHandle () {
    if( (window.scrollY + window.innerHeight) >= (document.body.scrollHeight - 300) )
    { scrollbtn.classList = ''; } else { scrollbtn.classList = 'show'; }
}

window.addEventListener("scroll", scrollbtnHandle);
window.addEventListener("touchmove", scrollbtnHandle);

scrollbtn.addEventListener("click", function(){
    window.scrollTo(0, document.body.scrollHeight);
});