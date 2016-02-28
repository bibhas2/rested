"use strict";

var remote = require('remote')
const electron = remote.require('electron');
// Module to control application life.
const app = electron.app;
const clipboard = electron.clipboard;
var fs = require('fs')
var url = require('url');
var http = require('http');
const https = require('https');
var Menu = remote.require('menu')
var MenuItem = remote.require('menu-item')
var jsonfile = require('jsonfile');
//window.$ = window.jQuery = require('jquery');

//require("../bower_components/jquery.splitter/js/jquery.splitter-0.20.0.js");

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
  this.project = {
    "dirty": false,
    "file": undefined,
    "history": [],
    "saved": []
  };
  this.responseBodyFormat = "pretty";
  this.sidebarTab = "history";
  this.requestEditorOptions = {
    lineWrapping : true,
    lineNumbers: true,
    theme: 'eclipse',
    mode: ''
  };
  this.responseEditorOptions = {
    lineWrapping : true,
    lineNumbers: true,
    theme: 'eclipse',
    mode: ''
  };
  this.requestContentType = "";
  this.request = {
    url: "",
    body: "",
    contentType: "",
    method: "GET",
    headers: {}
  };
  this.response = {
    headers: {},
    responseText: "",
    statusCode: undefined,
    statusMessage: "",
    errorMessage: undefined
  }
  this.ongoingRequest = undefined;
  this.selectedRequest = undefined;
  this.saveRequestName = "";

  var textTypesTable = [
    ["application/xml", "xml"],
    ["application/json", "javascript"],
    ["text/html", "xml"],
    ["text/json", "javascript"]
  ];

  this.resetResponseState = function() {
    this.response.responseText = "";
    this.response.headers = {};
    this.response.errorMessage = undefined;
    this.response.statusCode = undefined;
    this.response.statusMessage = "";
    this.responseEditorOptions.mode = "";
  }

  this.showBodyTypeMenu = function() {
    var event = document.createEvent("MouseEvents");
    event.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    document.getElementById("bodyTypeSelect").dispatchEvent(event);
  }

  this.contentTypeChanged = function() {
    textTypesTable.some(typeItem => {
      if (this.request.contentType === undefined) {
        return true; //Break out.
      }

      if (this.request.contentType.startsWith(typeItem[0])) {
        this.requestEditorOptions.mode = typeItem[1];

        return true;
      }

      return false;
    });
  }

  this.commitRequest = function() {
    var u = url.parse(this.request.url);

    //Fill in the protocol
    if (u.protocol === null) {
      this.request.url = "http://" + this.request.url;
      u = url.parse(this.request.url);
    }

    //console.log(u);
    if (this.request.contentType.length > 0) {
      this.request.headers["content-type"] = this.request.contentType;
    } else {
      delete this.request.headers["content-type"];
    }
    if (this.request.body.length > 0) {
      this.request.headers["content-length"] = this.request.body.length;
    } else {
      delete this.request.headers["content-length"];
    }

    //Push to history
    var historyItem = {
      url: this.request.url,
      headers: this.request.headers,
      contentType: this.request.contentType,
      body: this.request.body,
      method: this.request.method
    };

    this.project.history.push(historyItem);

    //Mark as dirty
    this.project.dirty = true;

    //Now make the request
    var httpOptions = {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port,
      path: u.path,
      method: this.request.method,
      headers: this.request.headers
    }

    this.resetResponseState();

    var httpClient = u.protocol === "https:" ? https : http;

    this.ongoingRequest = httpClient.request(httpOptions, (res) => {
      //Save the headers
      this.response.headers = res.headers;
      this.response.statusCode = res.statusCode;
      this.response.statusMessage = res.statusMessage;

      //Accumulate response body for textual data only.
      let contentType = res.headers["content-type"];
      let matchedType = undefined;

      textTypesTable.some(typeItem => {
        if (contentType === undefined) {
          return true; //Break out.
        }

        if (contentType.startsWith(typeItem[0])) {
          this.responseEditorOptions.mode = typeItem[1];
          res.setEncoding("utf8"); //Convert text to utf-8.
          matchedType = typeItem;

          return true;
        }

        return false;
      });

      res.on('data', (chunk) => {
        //Accumulate text only if we know how to show it.
        //Else just discard it.
        if (matchedType !== undefined) {
          this.response.responseText += chunk;
        }
      });

      res.on('end', () => {
        this.ongoingRequest = undefined;
        //console.log(res);
        $scope.$apply();
      });
    });

    this.ongoingRequest.on('error', (e) => {
      console.log(`problem with request: ${e.message}`);
      this.ongoingRequest = undefined;
      this.response.errorMessage = e.message;
      $scope.$apply();
    });

    // write data to request body
    if (this.request.body.length > 0) {
      this.ongoingRequest.write(this.request.body);
    }

    this.ongoingRequest.end();
  }

  this.cancelRequest = function() {
    if (this.ongoingRequest === undefined) {
      return;
    }

    this.ongoingRequest.abort();
  }

  this.selectRequest = function(item) {
      this.selectedRequest = item;
      //Clear response.
      this.resetResponseState();

      if (item !== undefined) {
        this.request = {
          url: item.url,
          body: item.body,
          contentType: item.contentType,
          method: item.method,
          headers: item.headers
        };
      }
  }

  this.clearHistory = function() {
    this.project.history.length = 0;
    this.project.dirty = true;

    this.selectRequest(undefined);
  }

  this.openSaveDialog = function() {
    document.getElementById("saveRequestDialog").showModal();
  }

  this.saveRequest = function() {
    //Push to history
    var savedItem = {
      name: this.saveRequestName,
      url: this.request.url,
      headers: this.request.headers,
      contentType: this.request.contentType,
      body: this.request.body,
      method: this.request.method
    };

    this.project.saved.push(savedItem);
    this.project.dirty = true;

    this.closeSaveDialog();
  }

  this.closeSaveDialog = function() {
    document.getElementById("saveRequestDialog").close();
  }

  this.removeSelectedSavedRequest = function() {
      if (this.selectedRequest.name === undefined) {
        return; //Must be a history item.
      }

      var idx = this.project.saved.indexOf(this.selectedRequest);

      if (idx < 0) {
        return;
      }

      this.project.saved.splice(idx, 1);
      this.project.dirty = true;
      this.selectRequest(undefined);
  }

  this.responseIsHTML = function() {
    var contentType = this.response.headers["content-type"];

    return contentType !== undefined && contentType.startsWith("text/html");
  }

  this.getResponseHTML = function() {
    if (!this.responseIsHTML()) {
      return undefined;
    }

    return $sce.trustAsHtml(this.response.responseText);
  }

  function getUserHome() {
    return process.env.HOME || process.env.USERPROFILE;
  }

  function getDefaultProjectFile() {
    return getUserHome() + "/" + ".rested_project";
  }

  this.saveProjectFile = function(file, onSuccess) {
    var filePath = file || this.project.file || getDefaultProjectFile();

    jsonfile.writeFile(filePath, this.project, (err) => {
      if (err !== null) {
        alert(`Filed to save settings: ${file}`);
        console.error(err);
      } else {
        this.project.file = this.project.file || file;
        this.project.dirty = false;
        document.title = "Rested - " + (this.project.file || "Untitled");
        if (onSuccess !== undefined) {
          onSuccess();
        }
      }
    });
  }

  this.loadProjectFile = function(file) {
    var filePath = file || getDefaultProjectFile();

    jsonfile.readFile(filePath, (err, obj) => {
      if (err !== null || obj === undefined) {
        if (err.code !== 'ENOENT') {
          alert(`Filed to load project: ${file}`);
        }
        console.error(err);
      } else {
        this.project = obj;
        this.project.file = file;
        this.project.dirty = false;
        document.title = "Rested - " + (this.project.file || "Untitled");
        this.selectRequest(undefined);

        $scope.$apply();
      }
    });
  }

  this.showProjectSaveDialog = function() {
    electron.dialog.showSaveDialog({title: "Save project"}, (path) => {
      if (path === undefined) {
        return;
      }

      this.saveProjectFile(path);
    });
  }

  this.showProjectOpenDialog = function() {
    this.closeProject(() => {
      electron.dialog.showOpenDialog({title: "Open project"}, (paths) => {
        if (paths === undefined || paths.length === 0) {
          return;
        }

        this.loadProjectFile(paths[0]);
      });
    });
  }

  this.closeProject = function(onSuccess) {
    if (this.project.dirty) {
      if (this.project.file === undefined) {
        //Save quietly
        this.saveProjectFile(undefined, () => {
          onSuccess();
        });
      } else {
        if (confirm("Project has changed. Would you like to save?"))  {
          this.saveProjectFile(undefined, () => {
            onSuccess();
          });
        } else {
          onSuccess();
        }
      }
    } else {
      onSuccess();
    }
  }

  this.quitApplication = function() {
    this.closeProject(() => {
      app.quit();
    })
  }

  this.init = function() {
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
              click: () => {
                this.quitApplication();
              }
            },
          ]
        },
        {
            label: "File",
            submenu: [
              {
                label: 'Open Project...',
                accelerator: 'CmdOrCtrl+O',
                click: () => {
                  this.showProjectOpenDialog();
                }
              },
              {
                label: 'Save Project...',
                accelerator: 'CmdOrCtrl+S',
                click: () => {
                  if (this.project.file === undefined) {
                    this.showProjectSaveDialog();
                  } else {
                    this.saveProjectFile();
                  }
                }
              },
              {
                label: 'Close Project',
                click: () => {
                  this.closeProject(() => {
                    this.loadProjectFile();
                  });
                }
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

    this.loadProjectFile();
  }

  this.init(); //Initialize the controller.
});
