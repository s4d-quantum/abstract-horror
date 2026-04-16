# **Print Server Documentation**

## **Overview**

Flask-based webhook print server running on `whprint.quantum-cloud.uk` that handles ZPL label printing to multiple devices and PDF printing to a laser printer.

## **Base URL**

http://whprint.quantum-cloud.uk:5000

## **Authentication**

All endpoints require an API key passed in the request header:

X-API-Key: 21screaM715525

---

## **Endpoints**

### **1\. Health Check**

**Endpoint:** `GET /health`  
 **Description:** Check if the server is running  
 **Auth Required:** No

curl http://whprint.quantum-cloud.uk:5000/health

---

### **2\. ZM600 Raw Print**

**Endpoint:** `POST /whzm600`  
 **Description:** Send raw ZPL directly to ZM600 printer via ttySC0  
 **Device:** `/dev/ttySC0`

curl \-X POST http://whprint.quantum-cloud.uk:5000/whzm600 \\  
  \-H "X-API-Key: 21screaM715525" \\  
  \-H "Content-Type: text/plain" \\  
  \--data-raw '^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ'

---

### **3\. ZM600 DPD Template Print**

**Endpoint:** `POST /whzm600dpd`  
 **Description:** Extract fields from DPD ZPL, populate template, and print to ZM600  
 **Device:** `/dev/ttySC0`

curl \-X POST http://whprint.quantum-cloud.uk:5000/whzm600dpd \\  
  \-H "X-API-Key: 21screaM715525" \\  
  \-H "Content-Type: text/plain" \\  
  \--data-binary @dpd\_label.zpl

---

### **4\. ZM600 Test Print**

**Endpoint:** `GET /test`  
 **Description:** Send a test label to ZM600 printer

curl http://whprint.quantum-cloud.uk:5000/test \\  
  \-H "X-API-Key: 21screaM715525"

---

### **5\. ZM4 Plus Raw Print**

**Endpoint:** `POST /whzm4`  
 **Description:** Send raw ZPL directly to ZM4 Plus printer via ttySC1  
 **Device:** `/dev/ttySC1`

curl \-X POST http://whprint.quantum-cloud.uk:5000/whzm4 \\  
  \-H "X-API-Key: 21screaM715525" \\  
  \-H "Content-Type: text/plain" \\  
  \--data-raw '^XA^FO50,50^ADN,36,20^FDZM4 Label^FS^XZ'

---

### **6\. ZM4 Plus Test Print**

**Endpoint:** `GET /whzm4/test`  
 **Description:** Send a test label to ZM4 Plus printer

curl http://whprint.quantum-cloud.uk:5000/whzm4/test \\  
  \-H "X-API-Key: 21screaM715525"

---

### **7\. Citizen Raw Print**

**Endpoint:** `POST /whcitizen`  
 **Description:** Send raw ZPL to Citizen printer via USB  
 **Device:** `/dev/usb/lp0`

curl \-X POST http://whprint.quantum-cloud.uk:5000/whcitizen \\  
  \-H "X-API-Key: 21screaM715525" \\  
  \-H "Content-Type: text/plain" \\  
  \--data-raw '^XA^FO50,50^ADN,36,20^FDCitizen Label^FS^XZ'

---

### **8\. Citizen DPD Template Print**

**Endpoint:** `POST /whcitizendpd`  
 **Description:** Extract fields from DPD ZPL, populate template, and print to Citizen  
 **Device:** `/dev/usb/lp0`

curl \-X POST http://whprint.quantum-cloud.uk:5000/whcitizendpd \\  
  \-H "X-API-Key: 21screaM715525" \\  
  \-H "Content-Type: text/plain" \\  
  \--data-binary @dpd\_label.zpl

---

### **9\. Citizen Test Print**

**Endpoint:** `GET /whcitizen/test`  
 **Description:** Send a test label to Citizen printer

curl http://whprint.quantum-cloud.uk:5000/whcitizen/test \\  
  \-H "X-API-Key: 21screaM715525"

---

### **10\. Laser Printer (PDF)**

**Endpoint:** `POST /laser`  
 **Description:** Send PDF to CUPS laser printer (Xerox\_wh)  
 **Printer:** `Xerox_wh`

curl \-X POST http://whprint.quantum-cloud.uk:5000/laser \\  
  \-H "X-API-Key: 21screaM715525" \\  
  \-H "Content-Type: application/pdf" \\  
  \--data-binary @document.pdf

---

## **DPD Template Fields**

The DPD template endpoints extract the following fields from incoming ZPL:

* `ADDRESS_BLOCK` \- Recipient address  
* `CONS_REF_BLOCK` \- Consignment reference  
* `TRACKING` \- Tracking number  
* `SERVICE` \- Service type  
* `DEST_CODE` \- Destination code  
* `ROUTE_CODE` \- Route code  
* `DATETIME` \- Date/time stamp  
* `DEPOT` \- Depot name  
* `DEPOT_CODE` \- Depot code  
* `BARCODE` \- Barcode data  
* `BARCODE_TEXT` \- Barcode text representation

These fields are populated into the template located at `/opt/printserver/template.zpl`.

---

## **Device Configuration**

| Printer | Device | Connection | Endpoints |
| ----- | ----- | ----- | ----- |
| ZM600 | `/dev/ttySC0` | RS232 (Waveshare HAT) | `/whzm600`, `/whzm600dpd`, `/test` |
| ZM4 Plus | `/dev/ttySC1` | RS232 (Waveshare HAT) | `/whzm4`, `/whzm4/test` |
| Citizen | `/dev/usb/lp0` | USB | `/whcitizen`, `/whcitizendpd`, `/whcitizen/test` |
| Xerox | CUPS: `Xerox_wh` | Network/CUPS | `/laser` |

---

## **Error Responses**

* **401 Unauthorized** \- Missing or invalid API key  
* **400 Bad Request** \- Empty payload  
* **500 Internal Server Error** \- Device write error or CUPS failure

---

## **Notes**

* All RS232 connections use 9600 baud rate  
* ZPL data should be sent as raw text/plain  
* PDF data for laser printer should be binary  
* The server runs on port 5000  
* Template path: `/opt/printserver/template.zpl`

