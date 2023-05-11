const lazyLoad = ()=> import("remote_app/Button");
import addButton from "./button";

import Button1 from 'remote_app/Button1';
import {Button2 as Btn2} from 'remote_app/Button2';
import Btn, {Button3 as Btn3} from 'remote_app/Button3';

export {Button4} from "remote_app/Button4"

console.log(Button1)
console.log(Btn2)
console.log(Btn, Btn3)

function addDiv(root) {
    const newDiv = document.createElement("div");
    const newContent = document.createTextNode("Hi from host");
    newDiv.appendChild(newContent);

    document.getElementById(root).appendChild(newDiv);
}

// Add a root node.
addDiv("root");
// Call the addButton method of local.
addButton("root")
// Call the addButton method of rollup-remote.
lazyLoad().then(item=>item.default("root"));
