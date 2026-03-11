use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Console {
    pub id: u32,
    pub name: String,
    pub manufacturer: String,
    pub year: u16,
    pub cpu: String,
    pub gpu: String,
    pub units_sold: Option<f32>, // in millions
}

impl Console {
    pub fn new(
        name: String,
        manufacturer: String,
        year: u16,
        cpu: String,
        gpu: String,
        units_sold: Option<f32>,
    ) -> Self {
        Self {
            id: 0, // Will be set by App
            name,
            manufacturer,
            year,
            cpu,
            gpu,
            units_sold,
        }
    }
    
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        if self.manufacturer.is_empty() {
            return Err("Manufacturer cannot be empty".to_string());
        }
        if self.year < 1970 || self.year > 2024 {
            return Err("Year must be between 1970 and 2024".to_string());
        }
        if self.cpu.is_empty() {
            return Err("CPU cannot be empty".to_string());
        }
        if self.gpu.is_empty() {
            return Err("GPU cannot be empty".to_string());
        }
        Ok(())
    }
}