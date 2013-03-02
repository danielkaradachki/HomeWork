using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace BindingToNullableField.Models
{
    public class Product
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; }
        public int? CategoryID { get; set; }
    }
}