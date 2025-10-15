// Quick poc for view full screen

window.addEventListener("load", (event) => {
  let fullScreenParamName = "fullscreen";
  let urlParams = new URLSearchParams(document.location.search);
  let param = urlParams.get(fullScreenParamName);
  if (param) {
    tempViewFullScreen();
  } else {
    setViewAtStart();
  }
});

let nhsNotify = nhsNotifyDefaults();

function nhsNotifyDefaults() {
  let defaults = {};
  defaults.storageName = "cb-checked";
  defaults.buttonName = "fullScreenButton";
  defaults.standard = "Standard";
  defaults.fullScreen = "Full Screen";
  return defaults;
}

function tempViewFullScreen() {
  viewFullScreen();
  let buttons = document.getElementsByName(nhsNotify.buttonName);
  buttons.forEach((item) => {
    item.style.display = "none";
  });
}

function viewFullScreen() {
  let sideBar = document.getElementsByClassName("side-bar")[0];
  let main = document.getElementsByClassName("main")[0];
  let pageInfo = document.getElementsByClassName("page-info")[0];
  sideBar.style.display = "none";
  main.style.maxWidth = "100%";
  main.style.marginLeft = "0px";
  if (pageInfo) pageInfo.style.display = "none";
}
function setFullScreen() {
  viewFullScreen();
  afterChange(nhsNotify.standard, nhsNotify.fullScreen);
}

function setStandard() {
  let sideBar = document.getElementsByClassName("side-bar")[0];
  let main = document.getElementsByClassName("main")[0];
  let pageInfo = document.getElementsByClassName("page-info")[0];
  sideBar.style.display = "";
  main.style.maxWidth = "";
  main.style.marginLeft = "";
  if (pageInfo) pageInfo.style.display = "";
  afterChange(nhsNotify.fullScreen, nhsNotify.standard);
}

function setViewAtStart() {
  let currentStatus = localStorage.getItem(nhsNotify.storageName);
  if (currentStatus == nhsNotify.fullScreen) makeChange(currentStatus);
}

function makeChange(newStatus) {
  if (newStatus == nhsNotify.fullScreen) {
    setFullScreen();
  } else {
    setStandard();
  }
}

function afterChange(currentStatus, newStatus) {
  let storageName = nhsNotify.storageName;
  let buttonName = nhsNotify.buttonName;
  let buttons = document.getElementsByName(buttonName);
  localStorage.setItem(storageName, newStatus);

  buttons.forEach((item) => {
    item.textContent = currentStatus + " View";
  });
}

function fullScreenToggle() {
  let standard = nhsNotify.standard;
  let fullScreen = nhsNotify.fullScreen;
  let storageName = nhsNotify.storageName;
  let currentStatus;
  let newStatus;

  currentStatus = localStorage.getItem(storageName);

  if (
    currentStatus == "false" ||
    currentStatus == "undefined" ||
    currentStatus == null ||
    currentStatus == standard
  ) {
    newStatus = fullScreen;
  }
  else {
    newStatus = standard;
  }

  makeChange(newStatus);
}
