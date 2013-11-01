using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace GridSelection.Models
{
    public class ServerSelectionViewModel
    {
        public IEnumerable<Category> Categories { get; set; }
        public IEnumerable<Product> Products { get; set; }
    }
}