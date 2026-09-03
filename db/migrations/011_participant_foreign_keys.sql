USE genz_os;

ALTER TABLE session_participants
  ADD CONSTRAINT fk_participants_customer
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_participants_member
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE SET NULL;
