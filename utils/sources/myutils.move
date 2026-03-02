
/// Module: utils
#[allow(unused_use)]
module utils::myutils{

    use std::string::{String};
    use iota::hex; //un carattere hex = 4 bit
    use std::u32;
    use std::u64;
    use std::ascii::Char;
    use std::debug::print;

    //implement a split function
    public fun split(str: String, token_separator_ascii: u8) : vector<String>{
        //prendi tutti i bytes
        let bytes: &vector<u8> = str.as_bytes();
        let mut results_token : vector<String> = vector[];
        let mut i = 0;
        let mut first = 0;
        let max = bytes.length();
        //let mess = b"Sono entrato nell'if".to_string();
        //cicla per tutti i bytes
        while(i < max) {

            //se sono == token_separator allora aggiugi a results, token con split
            if(bytes[i] == token_separator_ascii){
                results_token.push_back(str.substring(first, i));
                first = i + 1;
            };
            i =  i + 1;
        };
        results_token.push_back(str.substring(first, max));
        return results_token
    }

    //check all characters are lowercase
    public fun check_lowercase(str: String) : bool{
        let mut judgment = true;
        //prendi tutti i bytes
        let bytes: &vector<u8> = str.as_bytes();
        //cicla per ogni byte
        let mut i = 0;
        let max = bytes.length();
        //controlla che sia tra 97 e 122 ascii
        while(i < max) {
            let b = *vector::borrow(bytes, i);
            if (b >= 97 && b<=122) {} 
            else {
                judgment = false;
            };
            i =  i + 1;
        };
        
        judgment
    }

    //check if the string is hex
    public fun check_is_hex(str: String) : bool{
        if (str.length() % 2 != 0) {
            return false
        };

        let mut judgment = true;
        //prendi tutti i bytes
        let bytes: &vector<u8> = str.as_bytes();
        //cicla per ogni byte
        let mut i = 0;
        let max = bytes.length();

        //controlla che sia tra 97 e 122 ascii oppure numero
        while(i < max) {
            if(bytes[i] >= 97 && bytes[i]<=122 || 
                bytes[i] >= 48 && bytes[i]<=57) {} 
            else {
                judgment = false;
            };
            i =  i + 1;
        };
        judgment
    }
 
    //count digitis inside a number
    public fun count_digits(mut n: u64): u64 {
        let mut count = 0;
        if (n == 0) {
            return 1
        };
        while (n > 0) {
            count = count + 1;
            n = n / 10;
        };
        return count
    }

    const EExceedHex : u64 = 008;
    //sum bytes
    public fun sum_bytes_u8(v: &vector<u8>) : u8{
        //cicla per ogni byte
        let mut i = 0;
        let mut sum =0;
        let max = v.length();
        //saturing addition
        while(i < max) {
            sum = if ((sum as u16) + (v[i] as u16) > 255) {
                255
            } else {
                sum + v[i]
            };
            i = i + 1;
        };
        sum
    }

    public fun sum_bytes_u32(v: &vector<u8>) : u32{
        //cicla per ogni byte
        let mut i = 0;
        let mut sum : u32 =0;
        let max = v.length();
        //controlla che sia tra 97 e 122 ascii
        while(i < max) {
           sum = sum + (v[i] as u32);
           assert!(sum <= 4294967295, EExceedHex);
           i = i+1;
        };
        sum
    }


    //convert string into u64
    public fun string_to_u64(s: &String): Option<u64> {
        let bytes = std::string::as_bytes(s);
        let mut value: u64 = 0;
        let len = vector::length(bytes);
        let mut i = 0;

        while (i < len) {
            let b = *vector::borrow(bytes, i);
            let c = std::ascii::char(b);
            if (!std::ascii::is_valid_char(b)) {
                return option::none<u64>()
            };
            // otteniamo il valore numerico del carattere
            let digit_u8 = std::ascii::byte(c) - b"0"[0];
            let digit = digit_u8 as u64;
            if (digit_u8 > 9) {
                return option::none<u64>()
            };
            // check overflow
            if (value > (std::u64::max_value!() - digit) / 10) {
                return option::none<u64>()
            };
            value = value * 10 + digit;
            i = i + 1;
        };
        option::some(value)
    }

    //convert string to bool
    public fun boolean_from_str(str: &String): Option<bool>{
        if(str == b"True".to_string() || str == b"true".to_string()){
            return option::some(true)
        } else if (str == b"False".to_string() || str == b"false".to_string()){
            return option::some(false)
        };
        option::none()
    }

    //remove white spaces 
    public fun remove_white_spaces(str: &String) : String{
        //prendi tutti i bytes
        let bytes: &vector<u8> = str.as_bytes();
        let mut results_token : vector<String> = vector[];
        let mut i = 0;
        let mut first = 0;
        //some white space numbers
        let spaces = vector<u8>[32, 9, 10, 13]; //space, tab, line feed, carriage return
        let max = bytes.length();
        //cicla per tutti i bytes
        while(i < max) {
            //se sono un white space allora aggiugi a results, token con split
            if(spaces.contains(&bytes[i])){
                results_token.push_back(str.substring(first, i));
                first = i + 1;
            };
            i =  i + 1;
        };
        results_token.push_back(str.substring(first, max));

        //concatenate final string
        let mut finalStr = results_token.remove(0);
        let new_length = results_token.length();
        let mut s=0;
        while(s < new_length){
            finalStr.append(results_token.remove(0));
            s=s+1;
        };
        
        finalStr
    }

    public fun equals(first_str: &String, second_str: &String) : bool {
        //first: check if they have the same length
        let f_length = remove_white_spaces(first_str).length();
        let s_length = remove_white_spaces(second_str).length();
        if(f_length != s_length){
            return false
        };

        //second: loop over them and check ascii correspondance
        let f_copy = *first_str;
        let mut f = f_copy.to_ascii();
        let s_copy = *second_str;
        let mut s = s_copy.to_ascii();
        let mut i = 0;
        while(i < f_length){
            if(f.pop_char() == s.pop_char()){
                i = i+1;
            } else{
                return false
            }
            
        };
        return true
    }

}

