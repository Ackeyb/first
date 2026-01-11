import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useMediaQuery } from "react-responsive";

export default function Home() {
  const [docList, setDocList] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewHistory, setPreviewHistory] = useState("");
  const [fieldList, setFieldList] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [updateValues, setUpdateValues] = useState(["", "", "", "", ""]);
  const [operation, setOperation] = useState("increase");
  const [isSaved, setIsSaved] = useState(false);
  const [isDisplayed, setIsDisplayed] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [selectedFieldToDelete, setSelectedFieldToDelete] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [tempData, setTempData] = useState({});
　const [isExtraFieldsVisible, setIsExtraFieldsVisible] = useState(false);
  const [previousData, setPreviousData] = useState({});
  const [baseDataForDiff, setBaseDataForDiff] = useState({});

  useEffect(() => {
    document.body.style.backgroundColor = "#121212";
    document.body.style.color = "#ffffff";
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

  {/* データを取得する */}
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
      const orderedKeys = data._order || Object.keys(data);
      const sortedData = Object.fromEntries(
        orderedKeys
          .filter((key) => key !== "_order")
          .map((key) => [key, data[key]])
      );

      // 現在データと比較基準を別々に保持
      setTempData(sortedData);
      setBaseDataForDiff(sortedData);
      setFieldList(orderedKeys.filter((key) => key !== "_order"));

      // 並び順を維持した状態でプレビュー表示
      setPreviewText(
        orderedKeys
          .filter((key) => key !== "_order")
          .map((key) => `${key}: ${data[key]}`)
          .join("\n")
      );

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

  {/* プレビューと履歴を表示 */}
  const handleUpdateFieldMultiple = () => {
    if (!selectedField) return;

    let updatedData = { ...tempData }; // 現在値コピー
    let historyEntries = [];

    updateValues.forEach((value) => {
      if (value === "") return;

      const oldValue = updatedData[selectedField] || 0;
      let newValue = operation === "increase" ? oldValue + Number(value) : oldValue - Number(value);

      // 負の値の場合マイナスフィールドに振り替え
      if (newValue < 0 && selectedField !== "マイナス") {
        const minusChange = newValue;
        updatedData["マイナス"] = (updatedData["マイナス"] || 0) + minusChange;
        newValue = 0;
        historyEntries.push(
          `マイナス: ${tempData["マイナス"] || 0} → ${updatedData["マイナス"]} (${minusChange})`
        );
      }

      updatedData[selectedField] = newValue;

      // 履歴
      const fieldChange = newValue - oldValue;
      historyEntries.push(
        `${selectedField}: ${oldValue} → ${newValue} (${fieldChange >= 0 ? `+${fieldChange}` : fieldChange})`
      );
    });

    // 前回比付きプレビュー
    const previewWithDiff = Object.entries(updatedData)
      .map(([key, value]) => {
        const baseValue = baseDataForDiff[key] ?? value;
        const diff = value - baseValue;
        const diffText = diff === 0 ? "" : ` (${diff > 0 ? "+" : ""}${diff})`;
        return `${key}: ${value}${diffText}`;
      })
      .join("\n");

    setTempData(updatedData);
    setPreviewText(previewWithDiff);
    setPreviewHistory(prev => prev + (prev ? "\n" : "") + historyEntries.join("\n"));

    // 入力欄をクリア
    setUpdateValues(["", "", "", "", ""]);
  };
    
  {/* プレビューをクリップボードにコピーする */}
  const handleCopyToClipboard = () => {
    if (!isSaved) return;

    const footerText =
      "\n\n管理ツールはコチラ https://cap-stock-for-reryss.vercel.app/";

    const textToCopy = previewText + footerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };
  
  {/* 酒クズを追加する */}
  const handleAddField = () => {
    if (!newFieldName || newFieldValue === "") return;
    const numericValue = Number(newFieldValue);
    const updatedData = { ...tempData, [newFieldName]: numericValue };

    setTempData(updatedData);
    setFieldList(Object.keys(updatedData));
    setPreviewText(
      Object.entries(updatedData)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    );

    // 履歴に追加
    const newHistoryEntry = `追加: ${newFieldName} (${numericValue})`;
    setPreviewHistory((prevHistory) => prevHistory + (prevHistory ? "\n" : "") + newHistoryEntry);
  };

  {/* 酒ザコを追放する */}
  const handleDeleteField = () => {
    if (!selectedFieldToDelete) return;

    // 削除する値を取得
    const oldValue = tempData[selectedFieldToDelete];

    // データを更新
    const updatedData = { ...tempData };
    delete updatedData[selectedFieldToDelete];

    setTempData(updatedData);
    setFieldList(Object.keys(updatedData));
    setPreviewText(
      Object.entries(updatedData)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    );

    // 履歴に追加
    const newHistoryEntry = `追放: ${selectedFieldToDelete} (${oldValue})`;
    setPreviewHistory((prevHistory) => prevHistory + (prevHistory ? "\n" : "") + newHistoryEntry);
  };

  {/* データを保存する */}
  const handleSaveData = async () => {
    if (!selectedDoc || !isDisplayed) return;

    let baseTimestamp = new Date();
    baseTimestamp.setHours(baseTimestamp.getHours() + 9);
    let jstTimestamp = baseTimestamp.toISOString().split("T")[0]; // YYYY-MM-DD 形式
    let newDocName = jstTimestamp;
    let counter = 1;
    while (docList.includes(newDocName)) {
      newDocName = `${jstTimestamp}-${counter}`;
      counter++;
    }

    // Firestore に保存するデータを構築
    let saveData = { ...tempData };

    // `_order` を現在のキー一覧で洗い替え
    saveData["_order"] = Object.keys(saveData).filter(key => key !== "_order");

    // Firestore に保存
    const newDocRef = doc(db, "capstock", newDocName);
    await setDoc(newDocRef, saveData);

    // ステートを更新
    setIsSaved(true);
    setDocList([newDocName, ...docList].slice(0, 20)); // 20件まで保持
  };

  return (
    <div>
      {/* タイトル */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <h1 style={{ 
          color: "red", 
          borderBottom: "2px solid red", 
          paddingBottom: "5px",  
          fontSize: "1.5rem", 
          whiteSpace: "nowrap", 
          textAlign: "center",
          marginBottom: "15px" , 
  　　　　marginTop: "20px" 
        }}>
          Cap Management for ReRyss
        </h1>
      </div>

      {/* データを選択 */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>データを選択</label>
        <select onChange={(e) => setSelectedDoc(e.target.value)} value={selectedDoc} style={{ width: "60%" }}>
          <option value="">-- データを選択しやがれ --</option>
          {docList.map((docName) => (
            <option key={docName} value={docName}>{docName}</option>
          ))}
        </select>
        <button onClick={fetchSelectedDoc} disabled={!selectedDoc} style={{ marginLeft: "10px", width: "20%" }}>表示する</button>
      </div>

      <div
        style={{
          height: "16px",
          marginBottom: "8px",
          fontSize: "11px",
          color: "#aaa",
          opacity: isDisplayed ? 0 : 1,
          transition: "opacity 0.2s ease",
          pointerEvents: "none",
        }}
      >
        ※ 編集するには「表示する」を押してください
      </div>

      {/* 編集する酒クズ */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>編集する酒クズ</label>
        <select onChange={(e) => setSelectedField(e.target.value)} value={selectedField} disabled={!isDisplayed} style={{ width: "40%" }}>
          <option value="">酒クズ選択</option>
          {fieldList.map((field) => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        {[0,1,2,3,4].map((i) => (
          <input
            key={i}
            type="number"
            placeholder="数"
            value={updateValues[i]}
            disabled={!isDisplayed}
            onChange={(e) => {
              const newValues = [...updateValues];
              newValues[i] = e.target.value;
              setUpdateValues(newValues);
            }}
            style={{ marginLeft: "10px", width: "9%" }}
          />
        ))}
        <input type="radio" name="operation" value="increase" checked={operation === "increase"} disabled={!isDisplayed} onChange={() => setOperation("increase")} style={{ marginLeft: "10px" }} /> 増
        <input type="radio" name="operation" value="decrease" checked={operation === "decrease"} disabled={!isDisplayed} onChange={() => setOperation("decrease")} style={{ marginLeft: "10px" }} /> 減
        <button onClick={handleUpdateFieldMultiple} disabled={!isDisplayed} style={{ marginLeft: "10px", width: "12%" }}>反映</button>
      </div>

      {/* 追加・削除を表示/非表示にするボタン */}
      <button 
        onClick={() => setIsExtraFieldsVisible(!isExtraFieldsVisible)} 
        style={{
          marginBottom: "10px",
          padding: "4px 8px",  // 🔥 上下のパディングを減らす (4px)
          fontSize: "12px",
          lineHeight: "1.2",    // 🔥 行の高さを小さくする (1.2)
          cursor: "pointer",
          width: "100%",
          textAlign: "center",
          border: "1px solid #ccc",
          borderRadius: "5px"
        }}
      >
        {isExtraFieldsVisible ? "▼ 追加・追放を隠す" : "▶ 追加・追放を表示"}
      </button>

      {/* 追加・削除のフォーム（表示時のみ） */}
      {isExtraFieldsVisible && (
        <div style={{ marginBottom: "15px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
      
          {/* 追加する酒クズ */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>追加する酒クズ</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input 
                type="text" 
                placeholder="酒クズ名" 
                value={newFieldName} 
                onChange={(e) => setNewFieldName(e.target.value)} 
                style={{ flex: "1", padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }} 
              />
              <input 
                type="number" 
                placeholder="数" 
                value={newFieldValue} 
                onChange={(e) => setNewFieldValue(e.target.value)} 
                style={{ width: "80px", padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }} 
              />
              <button 
                onClick={handleAddField} 
                style={{ padding: "8px", cursor: "pointer", borderRadius: "5px", border: "1px solid #ccc" }}
              >
                追加
              </button>
            </div>
          </div>

          {/* 追放する酒ザコ */}
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>追放する酒ザコ</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select 
                onChange={(e) => setSelectedFieldToDelete(e.target.value)} 
                value={selectedFieldToDelete} 
                disabled={!isDisplayed}
                style={{ flex: "1", padding: "8px", border: "1px solid #ccc", borderRadius: "5px" }}
              >
                <option value="">追放酒ザコ選択</option>
                {fieldList.map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
              <button 
                onClick={handleDeleteField} 
                disabled={!isDisplayed}
                style={{ padding: "8px", cursor: "pointer", borderRadius: "5px", border: "1px solid #ccc" }}
              >
                追放
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プレビュー & 履歴 */}
      <div style={{ display: "flex", gap: "5px", justifyContent: "center", marginBottom: "15px" }}>
        <div style={{ width: "40%" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>プレビュー</label>
          <textarea value={previewText} readOnly rows={isMobile ? 10 : 18} style={{ width: "100%", marginTop: "5px" }}></textarea>
        </div>
        <div style={{ width: "56%" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>履歴</label>
          <textarea value={previewHistory} readOnly rows={isMobile ? 10 : 18} style={{ width: "100%", marginTop: "5px" }}></textarea>
        </div>
      </div>

      {/* 保存ボタン */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
        <button onClick={handleSaveData} disabled={!isDisplayed} style={{ width: "40%" }}>データを保存</button>
        {isSaved && <span style={{ marginLeft: "10px", color: "limegreen" }}>保存してやったぜ！</span>}
      </div>

      {/* コピー ボタン */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button onClick={handleCopyToClipboard} disabled={!isSaved} style={{ width: "40%" }}>テキストをコピー</button>
        {isCopied && <span style={{ marginLeft: "10px", color: "limegreen" }}>コピー完了！</span>}
      </div>
    </div>
  );
}
