import React from "react";

import { useEffect, useState, useRef } from "react";

import "antd/dist/antd.css";

import { Button, Input, Spin, Table, Modal } from "antd";
import { Row, Col } from "antd";

import { fixControlledValue } from "antd/lib/input/Input";

import api from "../api";

import GoogleMapReact from "google-map-react";
import { func } from "prop-types";

import home from "../../images/home.png";
import target from "../../images/arrow.png";
import { async } from "regenerator-runtime";

var dstOffset = null;
var rawOffset = null;

//used to display maker on the map
function Maker(props) {
  return (
    <div>
      <img src={props.src} />

      <h3 style={{ color: "red" }}>{props.text}</h3>
    </div>
  );
}

export function MapContainer() {
  return (
    <div style={{ marginTop: "5%" }}>
      <Map_manage />
    </div>
  );
}

//map component used to display map
//input: center : center on the map;localPos=local position ;userPos array = position of user input; visble: display when visble ==true;

function MapDisplay(props) {
  const makerList = props.userPos.map((item) => {
    return (
      <Maker
        key={item.index}
        lat={item.lat}
        lng={item.lng}
        text={item.index}
        src={target}
      />
    );
  });
  return (
    <div style={{ height: "768px", width: "1024px", marginTop: "2%" }}>
      {props.visble == true && (
        <GoogleMapReact
          bootstrapURLKeys={{ key: "AIzaSyDCGh24bypgqJqTzp04ap6vjRjSk9ICqic" }}
          defaultCenter={props.center}
          defaultZoom={15}
          zoom={props.zoom}
          center={props.center}
        >
          <Maker
            lat={props.localPos.lat}
            lng={props.localPos.lng}
            text="HOME"
            src={home}
          />
          {makerList}
        </GoogleMapReact>
      )}
    </div>
  );
}

//used to process user input and display information
//input:local pos, user input pos,target time,timezoon
//output: when user press enter and click search button

function User_Input_Display(props) {
  const refAddress = useRef(null); //ref of the input
  const [enter, setEnter] = useState(false); //valid if user press enter
  const [click, setClick] = useState(false); //valid if user click search button

  useEffect(() => {
    //add event listener to monitor if user press enter
    window.addEventListener("keydown", handle_keyDown);
    window.addEventListener("keyup", handle_keyUp);
  }, []);

  const handle_mouseDown = (e) => {
    setClick(true);
  };

  const handle_mouseUp = () => {
    setClick(false);
  };

  const handle_keyDown = (e) => {
    if (e.code == "Enter") {
      setEnter(true);
    }
  };

  const handle_keyUp = () => {
    setEnter(false);
  };

  //both button click, and press enter key on the keyboard
  if (enter && click) {
    setClick(false);
    setEnter(false);
    // callback from the Map_manage
    props.onClick(refAddress.current.state.value);
  }

  return (
    <div style={{ marginTop: "2%", marginLeft: "10%" }}>
      <Row gutter={[0, 8]}>
        <Col md={24} lg={8}>
          {props.userPos.length > 0 && (
            <h3>
              Target Address:&nbsp;
              {props.userPos[props.userPos.length - 1].address}
            </h3>
          )}
        </Col>

        <Col md={24} lg={12}>
          {props.userPos.length > 0 && (
            <h3>
              Target&nbsp;Latitude:&nbsp;{" "}
              {props.userPos[props.userPos.length - 1].lat.toFixed(6)}
              &nbsp;&nbsp;Longitude:&nbsp;
              {props.userPos[props.userPos.length - 1].lng.toFixed(6)}
            </h3>
          )}
        </Col>
      </Row>
      <Row style={{ marginTop: "2%" }}>
        <Col md={4} lg={2}>
          <h3>Input Address</h3>
        </Col>

        <Col md={20} lg={12}>
          <Input ref={refAddress} />
        </Col>

        <Col md={6} lg={6} style={{ marginLeft: "2%" }}>
          <Button
            type="primary"
            shape="round"
            onMouseDown={handle_mouseDown}
            onMouseUp={handle_mouseUp}
          >
            Search
          </Button>
        </Col>
      </Row>

      <Row style={{ marginTop: "2%" }}>
        <Col xs={8}>
          <h3>TargetTime:&nbsp;{props.targetTime}</h3>
        </Col>

        <Col xs={8}>
          <h3>Time Zone:&nbsp;{props.timeZone}</h3>
        </Col>
      </Row>
    </div>
  );
}

//used to control map display

function Map_manage() {
  const [zoom, setZoom] = useState(20); //zoom scale

  const [loading, setLoading] = useState(false); //if display Spin
  const [localPos, setLocalPos] = useState({});
  const [center, setCenter] = useState({}); //Map center point
  const [userPos, setUserPos] = useState([]);
  const [targetTime, setTargetTime] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [visble, setVisble] = useState(false); //if map display
  const [index, setIndex] = useState(1); //index of each target point

  const [modalVisble, setModalVisble] = useState(false); //if display error message dialog
  const [message, setMessage] = useState(""); //message of dialog

  const handle_ok = () => {
    setModalVisble(false);
  };

  useEffect(() => {
    //diaplay targetTime and time zoon
    //we set up a timer
    setInterval(async () => {
      if (dstOffset != null && rawOffset != null) {
        setTargetTime(api.getTargetTime(dstOffset, rawOffset));
      }
    }, 500);
  }, []);

  //get dstOffset, rawOffset to display target time
  const processTimeOffsetTimeZone = async (lat, lng) => {
    var targetInfo = await api.getTargetTimeInfoByPos(lat, lng);

    dstOffset = targetInfo[0];
    rawOffset = targetInfo[1];
    setTimeZone(targetInfo[2]);
  };

  //user input address and click search,we will display address on the map and target time information
  //This is callback function
  async function onClick(address) {
    if (loading == true) {
      return;
    }

    if (address == "" || address == null || address == undefined) {
      setMessage("address must be input");
      setModalVisble(true);
      return;
    }

    setVisble(false);

    //first we must get local position

    setLoading(true);

    try {
      var result = await api.getLocalPosition();
    } catch (err) {
      setMessage(
        "Can not get local position in http! Please change brower(Chrome is recommended) or used in https."
      );
      setLoading(false);
      setModalVisble(true);
    }

    var pos_local = new Object();
    pos_local.lat = result.latitude;
    pos_local.lng = result.longitude;

    setLoading(false);

    setLocalPos(pos_local);
    setCenter(pos_local);

    //Get the longitude and latitude from user input

    var pos_user = await api.getLatAndLng(address);
    if (pos_user.length == 0) {
      setMessage("address input err!");
      setModalVisble(true);
      return;
    }

    //modify userPos array
    var userPos_o = new Object();
    userPos_o.index = index;
    userPos_o.lat = pos_user[0];
    userPos_o.lng = pos_user[1];
    userPos_o.address = address;

    var userPos_g = userPos.slice(0);
    userPos_g.push(userPos_o);
    setUserPos(userPos_g);

    setIndex(index + 1);

    //get max distance to cal zoom scale
    var distance = api.getMaxDistance(pos_local, userPos_g);

    //set zoom scale
    setZoom(api.changeZoom(distance));

    ////get dstOffset, rawOffset to display target time
    await processTimeOffsetTimeZone(pos_user[0], pos_user[1]);

    setVisble(true);
  }

  //the function used when user delete one or more position
  const handle_delete = async (data) => {
    setVisble(false);

    setUserPos(data);

    setCenter(localPos);

    //Calculate zoom based on the distance between local pos and userPos

    if (data.length > 0) {
      var distance = api.getMaxDistance(localPos, data);

      setZoom(api.changeZoom(distance));

      ////get dstOffset, rawOffset to display target time
      await processTimeOffsetTimeZone(
        data[data.length - 1].lat,
        data[data.length - 1].lng
      );
    } else {
      //if data is empty
      setZoom(20);
      setIndex(1);
      dstOffset = null;
      rawOffset = null;
    }

    setVisble(true);
  };

  return (
    <div>
      <User_Input_Display
        localPos={localPos}
        userPos={userPos}
        onClick={onClick}
        targetTime={targetTime}
        timeZone={timeZone}
      />
      <div style={{ marginLeft: "10%" }}>
        <Spin tip="Get local position,please wait..." spinning={loading}>
          <MapDisplay
            zoom={zoom}
            center={center}
            localPos={localPos}
            userPos={userPos}
            visble={visble}
          />
        </Spin>
        <div style={{ marginTop: "5%", width: "80%" }}>
          {userPos.length > 0 && (
            <TableList data={userPos} handle_delete={handle_delete} />
          )}
        </div>
      </div>
      <Modal
        title="Message"
        visible={modalVisble}
        onOk={handle_ok}
        onCancel={handle_ok}
        width={400}
        closable={false}
        centered={true}
        maskClosable={false}
        okText="OK"
        cancelText="Cancel"
      >
        <h3>{message}</h3>
      </Modal>
    </div>
  );
}

//////////////////////////////////////////////The function used to display table//////////////////////////////////
const columns = [
  {
    title: "Index",
    dataIndex: "index",
  },
  {
    title: "Address",
    dataIndex: "address",
  },
];

function TableList(props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const deleteItem = () => {
    function searchIndex(inputObj) {
      return inputObj.index == this;
    }

    for (var i = 0; i < selectedRowKeys.length; i++) {
      var index = props.data.findIndex(searchIndex, selectedRowKeys[i]);
      if (index != -1) {
        props.data.splice(index, 1);
      }
    }

    setSelectedRowKeys([]);

    props.handle_delete(props.data);
  };

  ///create data
  var data = [];
  for (var i = 0; i < props.data.length; i++) {
    data.push({
      key: props.data[i].index,
      index: props.data[i].index,
      address: props.data[i].address,
    });
  }

  const onSelectChange = (selectedRowKeys) => {
    console.log("selectedRowKeys changed: ", selectedRowKeys);
    setSelectedRowKeys(selectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={deleteItem}
          disabled={selectedRowKeys.length <= 0}
        >
          Delete
        </Button>
      </div>
      <Table rowSelection={rowSelection} columns={columns} dataSource={data} />
    </div>
  );
}
