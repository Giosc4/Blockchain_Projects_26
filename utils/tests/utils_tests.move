
#[test_only]
module utils::utils_tests{
    use utils::myutils;
    use std::debug::{print};


    #[test]
    fun test_utils() {
        let string = b"ciao".to_string();
        let str_w_dot = b"pippo:Pluto:e-Paperino".to_string();
        let results = myutils::split(
            string, 
            105 );
        print(&b"Primo risultato".to_string());
        print(&results);

        let second_results = myutils::split(
            str_w_dot, 
            58);
        print(&b"Secondo risultato".to_string());
        print(&second_results);
    }

    #[test]
    fun test_white_spaces(){
        let string = b"Ciao come stai?".to_string();
        let no_space = utils::myutils::remove_white_spaces(&string);
        assert!(no_space == b"Ciaocomestai?".to_string());

    }
   
   #[test]
   fun test_equals(){
    let s = b"Ciao".to_string();
    let t = b"Ciao".to_string();
    assert!(true == utils::myutils::equals(&s, &t));
   }

   #[test]
   fun test_equals_fail(){
    let s = b"Ciao".to_string();
    let t = b"i topi non avevano nipoti".to_string();
    assert!(false == utils::myutils::equals(&s, &t));
   }
}


