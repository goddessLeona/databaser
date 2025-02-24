
const express = require("express");
const app = express();

const { db } = require(`./index.js`);

//Middleware för att läsa JSON-data från requests (to be able to use body in postman)
app.use(express.json());

//Middleware för att lägga till databasen i req.db
app.use((req, res, next) => {
  req.db = db; // Attach the 'db' to the request object
  console.log(`test to see if this middleware is working`);
  next();
});

//Server information
const PORT = 3000;
const URL = `localhost`;

//starta server
app.listen(PORT, URL, () => {
  console.log(`server is now running on ${URL}: ${PORT}`);
});

//--------------------------------------------------------Produkt hantering

// Uppgift 1 
// GET /products
// list all products with catogory and brand

app.get(`/products`, (req, res) => {
  try{

    const stmt = req.db.prepare(`SELECT 
    Products.Name AS products, 
    Product_brands.Name AS brand,
    Product_types.Type AS catogory
    FROM Products
    LEFT JOIN Product_brands ON products.Product_brand = Product_brands.id
    LEFT JOIN product_types ON products.Product_type = Product_types.id`);

  const products = stmt.all();
  res.json(products);

  }catch(error){
    console.error(`somthing whent wrong`,error.message);
  }
});

// Uppgift 2 
// /product:id 
// visa all information om en spesfik product

app.get(`/products/:id`, (req,res)=>{
    try{
        const { id } = req.params;

        const stmt = req.db.prepare(`SELECT 
        Products.id AS product_id,
        Products.Name AS product,
        Products.Price AS Price,
        Product_brands.Name AS brand,
        Product_types.Type AS catogory,
        Products.Stocks AS In_Stocke
        FROM Products
        LEFT JOIN Product_brands ON products.Product_brand = Product_brands.id
        LEFT JOIN product_types ON products.Product_type = Product_types.id
        WHERE Products.id = ?`);

        const result = stmt.all(id);
        res.json(result);
    }catch(error){
        console.error(`Somthing went wrong`, error.message)
    }
});
    
//Uppgift 3 
// Get/products/search?name={searchterm}
//localhost:3000/search/?name=apple (you get all products that have "apple" part of it)

app.get(`/search`, (req,res)=>{

    try{
        const {name} =req.query

        if(!name){
            return res.status(400).json({message:`Need to search for a product name`})
        }

        const stmt= req.db.prepare(`SELECT * FROM products WHERE Name LIKE ?`);
        const result = stmt.all(`%${name}%`);
        res.json(result);

    }catch(error){
        console.error(`somthing whent wrong`,error.message)
    }
})

//Uppgift 4 
// Get products/catogory/:catogoryid
//list all products in a spesefic catogory 
//Computers = 1, Phones = 2, Others= 3

app.get(`/products/catogory/:id`, (req,res)=>{
    try{
        const {id} = req.params

        const stmt = req.db.prepare(`SELECT 
            product_types.type AS catogory,
            products.name AS product
            FROM products 
            LEFT JOIN product_types ON products.product_type = product_types.id
            WHERE product_types.id = ?`);

        const result = stmt.all(id);
        res.json(result);

    }catch(error){
        console.error(`somthing whent wrong`,error.message);
    }
});

// Uppgift 5 
// Post/products/products
// create a new product add all information needed in reqquest body
// using postman 

app.post(`/products/products`, (req,res)=>{
    try{
        const { Name, Price, Stocks, Product_brand, Product_type } = req.body;

        if (!Name || !Price || !Stocks || !Product_brand || !Product_type) {
          return res.status(400).json({ message: `All fields are required`});
        }

        const stmt = req.db.prepare(`INSERT INTO Products 
            (Name, Price, Stocks, Product_brand, Product_type)
            VALUES (?,?,?,?,?)`);

        const result = stmt.run(Name,Price,Stocks,Product_brand,Product_type
        );

        if (result.lastInsertRowid) {
            return res.status(201).json({message: `Product successfully added`,
            id: result.lastInsertRowid,});
        } else {
          res.status(500).json({ message: `Failed to add product` });
        }

    }catch(error){
        console.error(`somthing whent wrong`,error.message);
    }
})

//Uppgift 6 
// PUT/product/:id
//updatera en existerande produkt
//Ny product info skickas i request body

app.put(`/product/update/:id`,(req,res)=>{
    try{

        const { Stocks } = req.body;
        const {id}= req.params;

        if (!Stocks) {
          return res.status(400).json({ message: `All fields are required` });
        }

        const stmt = req.db.prepare(`UPDATE products SET Stocks = ? WHERE id = ?`);
        const result = stmt.run(Stocks, id);
        console.log(result)

        res.status(200).json({message: `Product updated successfully`,
        id: id, updated_Stocks_Too: Stocks,});


    }catch(error){
        console.error(`Somthing went wrong`, error.message)
    }
})


//Uppgift 7 
// DELETE/products/:id
//Ta bort en produkt
//ska även ta bort alla produktens recensioner (CASCADE DELATE)


app.delete(`/products/delete/:id`, (req,res)=>{
    try{
        const {id}= req.params;

        const stmt = req.db.prepare(`DELETE FROM Products WHERE id = ?`);
        const resultat = stmt.run(id)

        if (resultat.changes > 0) {
          return res.json({message: "Product and comment deleted successfully",});
        } else {
          return res.status(404).json({ message: "Product not found" });
        }
         

    }catch(error){
        console.error(`somthing went wrong`, error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }

})

//----------------------------------------------------------Databas Relationer

// Implementera CASCADE DELETE mellan products och reviews

/* TABLE Product_rewuies (
    Products_id INTEGER,
    Customer_id INTEGER,
    Grades      TEXT,
    Comments    VARCHAR,
    PRIMARY KEY (Products_id,Customer_id),
    FOREIGN KEY (Products_id)
    REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (Customer_id)
    REFERENCES Customers (id) ON DELETE CASCADE
);*/

// Implementera CASCADE UPDATE mellan category och products

// har inte gjort detta ännu efersom alla som använde din databas 
// fick en uppdaterad version med lösning på det.
// I min databas hade det inte gjort mycket skilnad att läga til Update Casacde där
// I README.md filen liger en bild av strukturen på min databas 

//-----------------------------------------------------------Kundhantering

//Uppgift 8
// GET/customers/:id
// show customers information
// include orderhistorik using JOIN orders 

app.get(`/customers/orders/:id`,(req,res)=>{
    try{
        const {id} = req.params

        const stmt = req.db.prepare(`SELECT 
        customers.Name AS Customer,
        products.Name AS Products_Ordered,
        order_detaljs.Price AS Price,
        order_detaljs.Quanety AS quantety,
        orders.Date AS Order_date
        FROM Order_detaljs
        JOIN Orders ON order_detaljs.Order_id = orders.id
        JOIN products ON order_detaljs.Product_id = products.id
        JOIN customers ON orders.Customor_id = customers.id
        WHERE customers.id = ?`);

        const result = stmt.all(id);
        res.json(result);

    }catch(error){
        console.error(`somthing whent wrong`, error.message)
    }
})

//Uppgift 9 
//PUT /customers/:id 
// Update the customers contact information (email,phone,adress)

app.put(`/customers/:id`, (req, res) => {
  try{
    const { E_mail, Phone_nummber, Adress } = req.body;
    const { id } = req.params;

    if (!E_mail || !Phone_nummber || !Adress) {
    return res.status(400).json({ message: `All fields are required` });
    }

    const stmt = req.db.prepare(`UPDATE Customers 
    SET E_mail=?, Phone_nummber=?, Adress=?
    WHERE id=?`);

    const result = stmt.run( E_mail, Phone_nummber, Adress, id);
    console.log(result);

    if (result.changes > 0) {
        return res.status(200).json({ message: `Customor successfully updated`, id: id });
    } else {
        return res.status(500).json({ message: `Failed to update customer information` });
    }

  }catch(error){
    console.error(`somthing went wrong`, error.message)
  }
});

//Uppgift 10
//GET/customers/:id/orders
//list all orders for one spesefik customer
//only have one cutsomer that made 2 orders Customer with id.1


app.get(`/customers/:id`, (req,res)=>{
    try{
        const {id} =req.params

        const stmt = req.db.prepare(`SELECT 
        customers.Name AS cutsomer,
        products.name AS product_ordered,
        orders.date AS Order_date 
        FROM order_detaljs
        JOIN orders ON order_detaljs.Order_id = orders.id
        JOIN customers ON orders.Customor_id = customers.id
        JOIN products ON order_detaljs.Product_id =products.id
        WHERE customers.id =?`);
        
        const result = stmt.all(id);
        res.json(result)

    }catch(error){
        console.error(`somthing went wrong`,error.meassage)
    }
})

//-----------------------------------------------------------------Analysdata

//Uppgift 11
//GET/products/stats
// visa statisk grouped per catogory
// antal producter per catogory
// genomsnittligt pris per catogory


app.get(`/statestic/products`, (req,res)=>{

    try{

        const stmt = req.db.prepare(`SELECT 
        product_types.Type AS catogory,
        COUNT(product_types.Type) AS total,
        ROUND(AVG(products.Price),2) AS Average_price
        FROM products
        LEFT JOIN product_types ON products.Product_brand = product_types.id
        GROUP BY product_types.type
        ORDER BY product_types.id;`);

        const result= stmt.all()
        res.json(result);

    }catch(error){
        console.log(`Somthing went wrong`, error.message)
    }
})

//Uppgift 12
//GET/reviews/stats
//visa genomsnitligt betyg per product
// Använd GROUP BY för att sammanställa data

app.get(`/reviews/stats`, (req,res)=>{

    try{

        const stmt = req.db.prepare(`SELECT 
        products.Name AS product,
        AVG (product_rewuies.Grades) AS Average_Rating
        FROM product_rewuies
        JOIN products ON product_rewuies.Products_id = products.id
        GROUP BY products.Name;`);

        const result = stmt.all();
        res.json(result);

    }catch(error){
        console.error(`Somthing went wrong`,error.message)
    }
})

//----------------------------------------------------------------VG nivå


/*Uppgift 1
Validering & Felhantering
Implementera på minst 3 valfira endpoints:

Validering av Indata ?
*Productpristet måste vara större än 0
*E-mail måste vara giltigt format
*productnamn får inte vara tomma

Anpassa felmeddelanden som tydligt beskriver vad som gått fel.

Lämpliga HTTP-statuskoder(200,201,400, 404, etc.)
*/

//------------------------------------------------------------------Uppgift 1 VG

//Uppgift 5 uppdaterad till VG

// to add a product you have to fill in all the fieled (name,price,stocks,product_brand,product_type)
// Productpristet måste vara större än 0
// 201 = The request succeeded, and a new resource was created as a result.
// 400 = The server cannot or will not process the request due to be a CLIENT ERROR
// 500 = The server has encountered a situation it does not know how to handle.

app.post(`/products/vg/products`, (req, res) => {
  try {
    const { Name, Price, Stocks, Product_brand, Product_type } = req.body;

    if (!Name || !Price || !Stocks || !Product_brand || !Product_type) {
        return res.status(400).json({ message: `All fields are required` });
        }

    if (Price <= 0){
        return res.status(400).json({message: `Price have to be more than 0`})
    }

    const stmt = req.db.prepare(`INSERT INTO Products 
            (Name, Price, Stocks, Product_brand, Product_type)
            VALUES (?,?,?,?,?)`);

    const result = stmt.run(Name, Price, Stocks, Product_brand, Product_type);

    if (result.lastInsertRowid) {
      return res.status(201).json({message: `Product successfully added`,id: result.lastInsertRowid,});
    } else {
      res.status(400).json({ message: `Failed to add product` });
    }

  } catch (error) {
    console.error(`somthing whent wrong`, error.message);
    return res.status(500).json({ message: `Internal server error` });
  }
});

// Uppgift 6 uppdaterad till VG
// to update the stocks will only work if you add somthing (no emty field)
// If you write a string and not a nr in the stock field
// price will only update if the price is over 0
// 200 = The request succeeded
// 400 = The server cannot or will not process the request due to be a CLIENT ERROR 
// 500 = The server has encountered a situation it does not know how to handle. 

app.put(`/product/update/vg/:id`, (req, res) => {
  try {
    const { Price, Stocks } = req.body;
    const { id } = req.params;

    if (!Price || !Stocks) {
      return res.status(400).json({ message: `All fields are required` });
    }

    if (Stocks === undefined || isNaN(Stocks)) {
      return res.status(400).json({ message: "Stocks is a nummber" });
    }

    const stmt = req.db.prepare(
      `UPDATE products SET Price = ?, Stocks = ? WHERE id = ? AND Products.Price > 0`
    );
    const result = stmt.run(Price, Stocks, id);
    console.log(result);

    if (result.changes){
        res.status(200).json({
            message: `Product updated successfully`,
            id: id,
            updated_Price_Too: Price,
            updated_Stocks_Too: Stocks,
          });
    }else{
        return res.status(400).json
        ({ message: `Failed to update product information` });
    }

  } catch (error) {
    console.error(`Somthing went wrong`, error.message);
    return res.status(500).json({ message: `Internal server error` });
  }
});

// Uppgift 9 uppdaterad till VG
// E-mail + Phone_nummber + Address ska alla vara i fyllda för att det ska updatera
// E-mail must contain @ or it will get a error message
// Adress have to be a nr to be able to uppdate
// 200 = The request succeeded
// 400 = The server cannot or will not process the request due to be a CLIENT ERROR 
// 500 = The server has encountered a situation it does not know how to handle. 

app.put(`/customers/vg/:id`, (req, res) => {
  try {
    const { E_mail, Phone_nummber, Adress } = req.body;
    const { id } = req.params;


    if (!E_mail || !Phone_nummber || !Adress) {
      return res.status(400).json({ message: `All fields are required` });
    }
    
    console.log("Email being validated:", E_mail);
    const emailCorrect = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailCorrect.test(E_mail)){
        return res.status(400).json
        ({message: `E-mail must be filled in like this: email@mail.com`});
    }

    if (Adress === undefined || isNaN(Adress)) {
      return res.status(400).json
      ({ message: "Adress is representing a nr" });
    }

    const stmt = req.db.prepare(`UPDATE Customers 
    SET E_mail=?, Phone_nummber=?, Adress=?
    WHERE id=?`);

    const result = stmt.run(E_mail, Phone_nummber, Adress, id);
    console.log(result);

    if (result.changes === 0) {
        return res.status(400).json
        ({ message: `Failed to update customer information` });
    } else {
        return res.status(200).json
        ({ message: `Customor successfully updated`, id: id });
    }

  } catch (error) {
    console.error(`somthing went wrong`, error.message);
    return res.status(500).json({ message: `Internal server error` });
  }
});


//------------------------------------------------------------------uppgift 2 VG

//Valde alternativ 2
//Sorteringa av produktlistan
// lägg till query parameter för sortering
//t.ex /products? sort=price_asc eller /products?sort=name_desc
// la till ASC då tar vi de lägsta priset högst upp
// om jag använt DESC hade det blivit det högsta priset först

app.get(`/vg/products`, (req, res) => {
  try {
    const stmt = req.db.prepare(`SELECT 
    Products.Name AS products, 
    Products.Price,
    Product_brands.Name AS brand,
    Product_types.Type AS catogory
    FROM Products
    LEFT JOIN Product_brands ON products.Product_brand = Product_brands.id
    LEFT JOIN product_types ON products.Product_type = Product_types.id
    ORDER BY products.price ASC`);

    const products = stmt.all();
    res.json(products);

  } catch (error) {
    console.error(`somthing whent wrong`, error.message);
  }
});