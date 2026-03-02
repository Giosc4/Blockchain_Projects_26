
module utils::date_time{

    use std::string::{String};

    fun is_leap_year(year: u64): bool {
        if (year % 4 != 0) {
            return false
        } else if (year % 100 != 0) {
            return true
        } else if (year % 400 != 0) {
            return false
        } else {
            return true
        }
    }

    fun days_in_month(month: u64, year: u64): u64 {
        if (month == 2) {
            if (is_leap_year(year)) {
                return 29
            } else {
                return 28
            }
        } else if (month == 4 || month == 6 || month == 9 || month == 11) {
            return 30
        } else {
            return 31
        }
    }

    fun convert_milliseconds_to_date(ms: u64): vector<u64> {
        let total_days = ms / 86_400_000;
        let mut year = 1970;
        let mut days_remaining = total_days;

        // Calcola l'anno
        loop {
            let days_in_year = if (is_leap_year(year)) { 366 } else { 365 };
            if (days_remaining < days_in_year) {
                break
            };
            days_remaining = days_remaining - days_in_year;
            year = year + 1;
        };

        // Calcola il mese
        let mut month: u64 = 1;
        loop {
            let dim = days_in_month(month, year);
            if (days_remaining < dim) {
                break
            };
            days_remaining = days_remaining - dim;
            month = month + 1;
        };

        // Il giorno è il numero di giorni rimanenti + 1
        let day = days_remaining + 1;

        return vector<u64>[year, month, day]
    }

    public fun ms_to_string(ts: u64) : String{
        let infos = convert_milliseconds_to_date(ts);
        let mut date_str = infos[0].to_string();
        date_str.append(b"-".to_string());
        if(infos[1] <10){
            date_str.append(b"0".to_string());
        };
        date_str.append(infos[1].to_string());
        date_str.append(b"-".to_string());
        if(infos[2] <10){
            date_str.append(b"0".to_string());
        };
        date_str.append(infos[2].to_string());
        return date_str

    }
}