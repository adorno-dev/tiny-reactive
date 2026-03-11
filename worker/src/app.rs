use crate::models::Console;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct App {
    consoles: Vec<Console>,
    next_id: u32,
}

#[wasm_bindgen]
impl App {
    #[wasm_bindgen(constructor)]
    pub fn new() -> App {
        web_sys::console::log_1(&"🎮 Rust worker initialized".into());
        
        let mut app = App {
            consoles: Vec::new(),
            next_id: 1,
        };
        
        // Add sample data
        app.seed();
        app
    }
    
    fn seed(&mut self) {
        let samples = vec![
            Console::new(
                "PlayStation 5".to_string(),
                "Sony".to_string(),
                2020,
                "AMD Zen 2".to_string(),
                "AMD RDNA 2".to_string(),
                Some(59.0),
            ),
            Console::new(
                "Xbox Series X".to_string(),
                "Microsoft".to_string(),
                2020,
                "AMD Zen 2".to_string(),
                "AMD RDNA 2".to_string(),
                Some(21.0),
            ),
            Console::new(
                "Nintendo Switch".to_string(),
                "Nintendo".to_string(),
                2017,
                "NVIDIA Tegra X1".to_string(),
                "NVIDIA Maxwell".to_string(),
                Some(141.0),
            ),
        ];
        
        for mut console in samples {
            console.id = self.next_id;
            self.next_id += 1;
            self.consoles.push(console);
        }
    }
    
    // Create
    pub fn create(&mut self, console_val: JsValue) -> Result<JsValue, JsValue> {
        let mut console: Console = serde_wasm_bindgen::from_value(console_val)?;
        
        // Validate
        if let Err(e) = console.validate() {
            return Err(JsValue::from_str(&e));
        }
        
        console.id = self.next_id;
        self.next_id += 1;
        
        let created = console.clone();
        self.consoles.push(console);
        
        Ok(serde_wasm_bindgen::to_value(&created)?)
    }
    
    // Read all
    pub fn list(&self) -> Result<JsValue, JsValue> {
        Ok(serde_wasm_bindgen::to_value(&self.consoles)?)
    }
    
    // Read one
    pub fn get(&self, id: u32) -> Result<JsValue, JsValue> {
        match self.consoles.iter().find(|c| c.id == id) {
            Some(console) => Ok(serde_wasm_bindgen::to_value(console)?),
            None => Err(JsValue::from_str("Console not found")),
        }
    }
    
    // Update
    pub fn update(&mut self, id: u32, console_val: JsValue) -> Result<JsValue, JsValue> {
        let updated: Console = serde_wasm_bindgen::from_value(console_val)?;
        
        // Validate
        if let Err(e) = updated.validate() {
            return Err(JsValue::from_str(&e));
        }
        
        match self.consoles.iter_mut().find(|c| c.id == id) {
            Some(console) => {
                *console = updated;
                console.id = id; // Ensure ID doesn't change
                Ok(serde_wasm_bindgen::to_value(console)?)
            }
            None => Err(JsValue::from_str("Console not found")),
        }
    }
    
    // Delete
    pub fn delete(&mut self, id: u32) -> Result<JsValue, JsValue> {
        let initial_len = self.consoles.len();
        self.consoles.retain(|c| c.id != id);
        
        if self.consoles.len() < initial_len {
            Ok(JsValue::from_bool(true))
        } else {
            Err(JsValue::from_str("Console not found"))
        }
    }
}