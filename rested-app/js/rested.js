"use strict";

var remote = require('remote')
const electron = remote.require('electron');
// Module to control application life.
const app = electron.app;
const clipboard = electron.clipboard;
var fs = require('fs')

var Menu = remote.require('menu')
var MenuItem = remote.require('menu-item')
var jsonfile = require('jsonfile');
//window.$ = window.jQuery = require('jquery');

//require("../bower_components/jquery.splitter/js/jquery.splitter-0.20.0.js");
var template = [
  {
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() { app.quit(); }
        },
      ]
    },
    {
      label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]
    }
];

var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// Build our new menu
var menu = new Menu()
menu.append(new MenuItem({
  label: 'Open developer tool',
  click: function() {
    remote.getCurrentWindow().webContents.openDevTools();
  }
}))
menu.append(new MenuItem({
  label: 'More Info...',
  click: function() {
    // Trigger an alert when menu item is clicked
    alert('Here is more information')
  }
}))

// Add the listener
document.addEventListener('DOMContentLoaded', function () {
  // document.querySelector('.js-context-menu').addEventListener('click', function (event) {
  //   menu.popup(remote.getCurrentWindow());
  // })
  document.addEventListener('contextmenu', function (event) {
    menu.popup(remote.getCurrentWindow());
  })
})

angular.module("RestedApp", ['ui.codemirror'])
.controller("MainController", function($scope, $sce) {
  this.init = function() {
    
  }

  this.init(); //Initialize the controller.
});
