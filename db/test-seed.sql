USE genz_os;

-- Staging-only food catalogue. This file is mounted only by docker-compose.test.yml.
INSERT INTO menu_items(id,name,category,image_url,member_price,non_member_price,stock_qty,active,created_at,updated_at) VALUES
('TEST-FOOD-BURGER','Classic Chicken Burger','Burgers',NULL,149,169,50,TRUE,NOW(3),NOW(3)),
('TEST-FOOD-FRIES','Peri Peri Fries','Sides',NULL,89,99,75,TRUE,NOW(3),NOW(3)),
('TEST-FOOD-PIZZA','Cheese Pizza','Pizza',NULL,179,199,30,TRUE,NOW(3),NOW(3)),
('TEST-FOOD-NUGGETS','Chicken Nuggets','Sides',NULL,109,129,40,TRUE,NOW(3),NOW(3)),
('TEST-FOOD-COKE','Coke 500ml','Beverages',NULL,49,59,100,TRUE,NOW(3),NOW(3)),
('TEST-FOOD-SPRITE','Sprite 500ml','Beverages',NULL,49,59,100,TRUE,NOW(3),NOW(3)),
('TEST-FOOD-WATER','Mineral Water 1L','Beverages',NULL,30,35,100,TRUE,NOW(3),NOW(3)),
('TEST-FOOD-BROWNIE','Chocolate Brownie','Desserts',NULL,79,89,25,TRUE,NOW(3),NOW(3))
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  category=VALUES(category),
  member_price=VALUES(member_price),
  non_member_price=VALUES(non_member_price),
  stock_qty=VALUES(stock_qty),
  active=VALUES(active),
  updated_at=NOW(3);
