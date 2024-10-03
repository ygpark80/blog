-- Create the bananastand database
CREATE DATABASE IF NOT EXISTS bananastand;

-- Switch to bananastand database
USE bananastand;

-- Create bananas table
CREATE TABLE IF NOT EXISTS bananas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    ripeness_level ENUM('Unripe', 'Ripe', 'Overripe') NOT NULL,
    price DECIMAL(5, 2) NOT NULL,
    date_received DATE NOT NULL
);

-- Insert some sample data into bananas table
INSERT INTO bananas (type, ripeness_level, price, date_received) VALUES
('Cavendish', 'Ripe', 1.20, '2024-10-01'),
('Plantain', 'Unripe', 0.90, '2024-10-02'),
('Red Banana', 'Overripe', 1.50, '2024-10-03');


-- Create the pizzaplanet database
CREATE DATABASE IF NOT EXISTS pizzaplanet;

-- Switch to pizzaplanet database
USE pizzaplanet;

-- Create pizzas table
CREATE TABLE IF NOT EXISTS pizzas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    toppings TEXT NOT NULL,
    size ENUM('Small', 'Medium', 'Large', 'Extra Large') NOT NULL,
    price DECIMAL(6, 2) NOT NULL
);

-- Create special_ingredients table linking pizzaplanet with bananastand
CREATE TABLE IF NOT EXISTS special_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pizza_id INT NOT NULL,
    banana_id INT NOT NULL,
    amount_needed INT NOT NULL,
    FOREIGN KEY (pizza_id) REFERENCES pizzas(id)
);

-- Insert some sample data into pizzas table
INSERT INTO pizzas (name, toppings, size, price) VALUES
('Banana Deluxe', 'Banana, Cheese, Tomato Sauce', 'Large', 15.99),
('Tropical Banana Special', 'Banana, Pineapple, Ham, Cheese', 'Medium', 13.50);

-- Insert some sample data into special_ingredients table
INSERT INTO special_ingredients (pizza_id, banana_id, amount_needed) VALUES
(1, 1, 2),  -- Banana Deluxe uses 2 Cavendish bananas
(2, 2, 3);  -- Tropical Banana Special uses 3 Plantain bananas
