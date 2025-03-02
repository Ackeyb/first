import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useMediaQuery } from "react-responsive";

export default function Home() {
  const [docList, setDocList] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [fieldList, setFieldList] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [updateValue, setUpdateValue] = useState("");
  const [operation, setOperation] = useState("increase");
  const [isSaved, setIsSaved] = useState(false);
  const [isDisplayed, setIsDisplayed] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [selectedFieldToDelete, setSelectedFieldToDelete] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [tempData, setTempData] = useState({});


  useEffect(() => {
    const fetchDocs = async () => {
      const querySnapshot = await getDocs(collection(db, "capstock"));
      let docs = querySnapshot.docs.map((doc) => doc.id);
      docs.sort().reverse(); // 日付順にソート
      if (docs.length > 20) {
        for (let i = 20; i < docs.length; i++) {
          await deleteDoc(doc(db, "capstock", docs[i]));
        }
        docs = docs.slice(0, 20);
      }
      setDocList(docs);
    };
    fetchDocs();
  }, []);

const fetchSelectedDoc = async () => {
  if (!selectedDoc) {
    console.error("selectedDoc が選択されていません");
    return;
  }

  try {
    const docRef = doc(db, "capstock", selectedDoc);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Firestore のデータ:", data);

      setTempData(data); // tempDataにデータをセット
      setFieldList(Object.keys(data));
      const formattedText = Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      setPreviewText(formattedText);
      setIsDisplayed(true);
    } else {
      console.warn("データが見つかりません:", selectedDoc);
      setTempData({});
      setPreviewText("データが見つかりません");
      setFieldList([]);
      setIsDisplayed(false);
    }
  } catch (error) {
    console.error("fetchSelectedDoc のエラー:", error);
  }
};

  const handleUpdateField = () => {
    if (!selectedField || updateValue === "") return;
    const oldValue = tempData[selectedField] || 0;
    const changeAmount = Number(updateValue);
    const newValue = operation === "increase" ? oldValue + changeAmount : oldValue - changeAmount;

    const updatedData = { ...tempData, [selectedField]: newValue };
    setTempData(updatedData);
    setPreviewText(
      Object.entries(updatedData)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    );
  };
  const handleCopyToClipboard = () => {
    if (!isSaved) return;
    navigator.clipboard.writeText(previewText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleAddField = () => {
    if (!newFieldName || newFieldValue === "") return;
    const updatedData = { ...tempData, [newFieldName]: Number(newFieldValue) };
    setTempData(updatedData);
    setFieldList(Object.keys(updatedData));
    setPreviewText(
      Object.entries(updatedData)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    );
  };

  const handleDeleteField = () => {
    if (!selectedFieldToDelete) return;
    const updatedText = previewText
      .split("\n")
      .filter((line) => !line.startsWith(`${selectedFieldToDelete}:`))
      .join("\n");
    setPreviewText(updatedText);
  };

  const handleSaveData = async () => {
    if (!selectedDoc || !isDisplayed) return;
    let baseTimestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD 形式
    let newDocName = baseTimestamp;
    let counter = 1;
    while (docList.includes(newDocName)) {
      newDocName = `${baseTimestamp}-${counter}`;
      counter++;
    }
    const newDocRef = doc(db, "capstock", newDocName);
    await setDoc(newDocRef, { ...previewText.split("\n").reduce((acc, line) => {
      const [key, value] = line.split(": ");
      return { ...acc, [key]: Number(value) };
    }, {}) });
    setIsSaved(true);
    setDocList([newDocName, ...docList].slice(0, 20)); // 20件まで保持
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#121212", color: "#ffffff", minHeight: "100vh" }}>
      <h1 style={{ color: "red", borderBottom: "2px solid red", paddingBottom: "10px" , whiteSpace: "nowrap" , overflow: "hidden" , fontSize: "1.7rem" , width: "100%" }}>Cap Management for ReRyss</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <select onChange={(e) => setSelectedDoc(e.target.value)} value={selectedDoc} style={{ marginTop: "20px" , width: "60%" }}>
          <option value="">-- データを選択しやがれ --</option>
          {docList.map((docName) => (
            <option key={docName} value={docName}>{docName}</option>
          ))}
        </select>
        <button onClick={fetchSelectedDoc} disabled={!selectedDoc} style={{ marginLeft: "10px" , width: "20%" }}>表示する</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select onChange={(e) => setSelectedField(e.target.value)} value={selectedField} style={{ width: "40%" }}>
          <option value="">編集する酒クズ選択</option>
          {fieldList.map((field) => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
        <input type="number" placeholder="数" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} style={{ marginLeft: "10px" , width: "10%", marginTop: "10px" }} />
        <input type="radio" name="operation" value="increase" checked={operation === "increase"} onChange={() => setOperation("increase")} style={{ marginLeft: "10px" }} /> 増
        <input type="radio" name="operation" value="decrease" checked={operation === "decrease"} onChange={() => setOperation("decrease")} style={{ marginLeft: "10px" }} /> 減
        <button onClick={handleUpdateField} style={{ marginLeft: "10px" , width: "15%", marginTop: "10px" }}>反映</button>
      </div>
          
      <div style={{ marginBottom: "10px" }}>
        <input type="text" placeholder="追加酒クズ名入力" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} style={{ width: "40%" }} />
        <input type="number" placeholder="数" value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)} maxLength={4} style={{ marginLeft: "10px", width: "10%" }} />
        <button onClick={handleAddField} style={{ marginLeft: "10px" ,  width: "15%" }}>追加</button>
      </div>
      
      <div style={{ marginBottom: "10px" }}>
        <select onChange={(e) => setSelectedFieldToDelete(e.target.value)} value={selectedFieldToDelete} style={{ width: "40%" }}>
          <option value="">追放酒ザコ選択</option>
          {fieldList.map((field) => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
        <button onClick={handleDeleteField} style={{ marginLeft: "10px" , width: "15%" }}>追放</button>
      </div>

      <textarea value={previewText} readOnly rows={isMobile ? 5 : 10} style={{ width: "100%", marginTop: "20px", marginBottom: "20px" }}></textarea>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px"  }}>
        <button onClick={handleSaveData} disabled={!isDisplayed} style={{ width: "40%" }}>データを保存</button>
        {isSaved && <span style={{ marginLeft: "10px", color: "limegreen" }}>保存してやったぜ！</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center"}}>
        <button onClick={handleCopyToClipboard} disabled={!isSaved} style={{ width: "40%" }}>テキストをコピー</button>
        {isCopied && <span style={{ marginLeft: "10px", color: "limegreen" }}>コピー完了！</span>}
      </div>
    </div>
  );
}
