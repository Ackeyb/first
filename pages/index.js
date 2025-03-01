import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";

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
    if (!selectedDoc) return;
    const docRef = doc(db, "capstock", selectedDoc);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      setFieldList(Object.keys(data));
      const formattedText = Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
      setPreviewText(formattedText);
      setIsDisplayed(true);
    } else {
      setPreviewText("データが見つかりません");
      setFieldList([]);
      setIsDisplayed(false);
    }
  };

  const handleUpdateField = async () => {
    if (!selectedDoc || !selectedField || updateValue === "") return;
    const docRef = doc(db, "capstock", selectedDoc);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const newValue = operation === "increase" ? (data[selectedField] || 0) + Number(updateValue) : (data[selectedField] || 0) - Number(updateValue);
      const updatedData = { ...data, [selectedField]: newValue };
      await updateDoc(docRef, updatedData);
      fetchSelectedDoc();
    }
  };

  const handleCopyToClipboard = () => {
    if (!isSaved) return;
    navigator.clipboard.writeText(previewText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleAddField = async () => {
    if (!selectedDoc || !newFieldName || newFieldValue === "") return;
    const docRef = doc(db, "capstock", selectedDoc);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data[newFieldName]) {
        const updatedData = { ...data, [newFieldName]: Number(newFieldValue) };
        await updateDoc(docRef, updatedData);
        fetchSelectedDoc();
      }
    } else {
      await setDoc(docRef, { [newFieldName]: Number(newFieldValue) });
      fetchSelectedDoc();
    }
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
      <h1 style={{ color: "red", marginBottom: "20px" }}>Cap Management for ReRyss</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <select onChange={(e) => setSelectedDoc(e.target.value)} value={selectedDoc}>
          <option value="">-- データを選択しやがれ --</option>
          {docList.map((docName) => (
            <option key={docName} value={docName}>{docName}</option>
          ))}
        </select>
        <button onClick={fetchSelectedDoc} disabled={!selectedDoc} style={{ marginLeft: "10px" }}>表示する</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select onChange={(e) => setSelectedField(e.target.value)} value={selectedField}>
          <option value="">編集する酒クズ</option>
          {fieldList.map((field) => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
        <input type="number" placeholder="数量" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} maxLength={4} style={{ marginLeft: "10px", width: "60px" }} />
        <input type="radio" name="operation" value="increase" checked={operation === "increase"} onChange={() => setOperation("increase")} style={{ marginLeft: "10px" }} /> 増
        <input type="radio" name="operation" value="decrease" checked={operation === "decrease"} onChange={() => setOperation("decrease")} style={{ marginLeft: "10px" }} /> 減
        <button onClick={handleUpdateField} style={{ marginLeft: "10px" }}>反映</button>
      </div>
          
      <div style={{ marginBottom: "10px" }}>
        <input type="text" placeholder="追加酒クズ名" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} />
        <input type="number" placeholder="数量" value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)} maxLength={4} style={{ marginLeft: "10px", width: "60px" }} />
        <button onClick={handleAddField} style={{ marginLeft: "10px" }}>酒クズ追加</button>
      </div>
      
      <div style={{ marginBottom: "10px" }}>
        <select onChange={(e) => setSelectedFieldToDelete(e.target.value)} value={selectedFieldToDelete}>
          <option value="">追放する酒ザコ</option>
          {fieldList.map((field) => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
        <button onClick={handleDeleteField} style={{ marginLeft: "10px" }}>酒ザコ追放</button>
      </div>

      <textarea value={previewText} readOnly rows={10} cols={40} style={{ display: "block", margin: "30px 0" }}></textarea>      
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={handleSaveData} disabled={!isDisplayed}>データを保存</button>
        {isSaved && <span style={{ marginLeft: "10px", color: "limegreen" }}>保存してやったぜ！</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button onClick={handleCopyToClipboard} disabled={!isSaved}>テキストをコピー</button>
        {isCopied && <span style={{ marginLeft: "10px", color: "limegreen" }}>コピー完了！</span>}
      </div>
    </div>
  );
}
