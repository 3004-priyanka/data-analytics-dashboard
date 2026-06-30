const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Server Running 🚀");
});

app.get("/sales", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sales");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Database Error");
  }
});

app.post("/sales", async (req, res) => {
  try {
    const { customer, product, amount } = req.body;

    await pool.query(
      "INSERT INTO sales (customer, product, amount) VALUES ($1, $2, $3)",
      [customer, product, amount]
    );

    res.send("Sale Added Successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Database Error");
  }
});

app.delete("/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM sales WHERE id = $1",
      [id]
    );

    res.send("Sale Deleted Successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Database Error");
  }
});
app.put("/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { customer, product, amount } = req.body;

    await pool.query(
      "UPDATE sales SET customer=$1, product=$2, amount=$3 WHERE id=$4",
      [customer, product, amount, id]
    );

    res.send("Sale Updated Successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Database Error");
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});