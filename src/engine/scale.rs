#[inline(always)]
pub fn scale(buf: &mut [f64], factor: f64) {
    for val in buf {
        *val *= factor;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scale() {
        let mut data = vec![1.0, 2.5, -4.0];
        scale(&mut data, 2.0);
        assert_eq!(data, vec![2.0, 5.0, -8.0]);
    }
}
