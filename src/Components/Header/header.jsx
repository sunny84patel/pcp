const Header = () => {
  return (
    <>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        borderBottom: "1px solid #ccc",
      }}
    >
      <div style={{ width: 150, height: 40, backgroundColor: "#ccc" }}></div>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <span>👤 14304</span>
        <span>All Categories ▼</span>
        <span>Hot Deals</span>
        <span>Compare Product</span>
        <span>🔔 Price Alert</span>
        <span>🤍</span>
        <span>🔔</span>
        <button
          style={{
            padding: "5px 10px",
            backgroundColor: "black",
            color: "white",
            borderRadius: "5px",
          }}
        >
          Login/Sign Up
        </button>
      </div>
    </div>
    </>
  );
};

export default Header;
